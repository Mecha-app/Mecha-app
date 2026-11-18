"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProRequiredError = void 0;
exports.diagnosisCacheKey = diagnosisCacheKey;
exports.executeDiagnosis = executeDiagnosis;
const node_crypto_1 = require("node:crypto");
const ai_1 = require("./ai");
const tracing_1 = require("./tracing");
const quota_1 = require("./quota");
class ProRequiredError extends Error {
    code = "pro_required";
    constructor() {
        super("The deep diagnosis tier is a MECHA Pro feature.");
        this.name = "ProRequiredError";
    }
}
exports.ProRequiredError = ProRequiredError;
function diagnosisCacheKey(req) {
    const normalized = JSON.stringify({
        problem: req.problem.trim().toLowerCase(),
        vehicleInfo: (req.vehicleInfo ?? "").trim().toLowerCase(),
        language: (req.language ?? "en").trim().toLowerCase(),
        tier: req.tier === "deep" ? "deep" : "triage",
    });
    return (0, node_crypto_1.createHash)("sha256").update(normalized).digest("hex");
}
async function* executeDiagnosis(deps, input) {
    const { store, provider } = deps;
    const { user, request } = input;
    const tier = request.tier === "deep" ? "deep" : "triage";
    // No phone gate (owner's rules, 2026-11-16): an ACCOUNT is the
    // diagnosis requirement — the routes refuse signed-out calls with
    // 401 before this service runs — and the free count keys on the
    // account record. A phone number is optional profile data (the
    // dashboard's dismissible card collects it); it never blocks a
    // signed-in account from diagnosing.
    // 1. Tier gate.
    if (tier === "deep" && user.plan !== "pro")
        throw new ProRequiredError();
    // 2. Quota consume — BEFORE anything that could cost money.
    let usedAfter = user.freeDiagnosesUsed;
    if (user.plan !== "pro") {
        const result = await store.consumeFreeDiagnosis(user.id);
        if (!result.consumed) {
            throw new quota_1.QuotaExhaustedError((0, quota_1.quotaStateFor)({ plan: user.plan, freeDiagnosesUsed: result.used }));
        }
        usedAfter = result.used;
    }
    const quotaAfter = (0, quota_1.quotaStateFor)({ plan: user.plan, freeDiagnosesUsed: usedAfter });
    yield { type: "quota", quota: quotaAfter, message: (0, quota_1.countdownMessage)(quotaAfter.remaining) };
    // PERSIST (step 5, hoisted): EVERY completed run saves a diagnosis
    // record against the account — linked to the named vehicle when the
    // request carried one, unlinked (vehicleId null) with the vehicle
    // string otherwise. Before Pass 15 the record was saved ONLY when a
    // vehicleId arrived, and no form ever sent one — so real diagnoses
    // ran, consumed quota, and left no history anywhere (the Vault read
    // "No diagnoses saved for this vehicle yet" for cars diagnosed
    // repeatedly). Persistence must never fail a diagnosis the owner
    // already paid for: save errors are logged, not thrown.
    const persistRecord = async (report) => {
        try {
            await store.saveDiagnosisRecord({
                userId: user.id,
                vehicleId: input.vehicleId ?? null,
                vehicleInfo: request.vehicleInfo ?? null,
                problemText: request.problem,
                imageUrl: request.imageUrl,
                aiResult: report,
            });
        }
        catch (err) {
            console.error(JSON.stringify({
                event: "diagnosis_persistence_warning",
                detail: err instanceof Error ? err.message : "unknown",
            }));
        }
    };
    // 3. Cache — identical question, identical answer, zero AI spend.
    // A cache hit is still a run the driver made: it saves a record too
    // (linked the same way), so history shows every consumed run.
    const cacheKey = diagnosisCacheKey(request);
    const cached = await store.getCachedDiagnosis(cacheKey);
    if (cached) {
        await persistRecord(cached.report);
        yield {
            type: "done",
            report: cached.report,
            model: cached.model,
            tier: cached.tier,
            source: "cache",
            latency: null,
            quota: quotaAfter,
            message: (0, quota_1.countdownMessage)(quotaAfter.remaining),
        };
        return;
    }
    // 4 + 5. Stream the provider, then persist. The Langfuse trace handle
    // is a no-op unless tracing is wired (lib/server/tracing.ts); cache
    // hits above never reach it — no LLM call, nothing to trace.
    const trace = (0, tracing_1.startDiagnosisTrace)({
        userId: user.id,
        tier,
        language: request.language,
        promptVersion: ai_1.DIAGNOSIS_PROMPT_VERSION,
        prompt: (0, ai_1.buildDiagnosisPrompt)(request),
    });
    try {
        for await (const event of provider.stream(request)) {
            if (event.type === "delta") {
                yield { type: "delta", text: event.text };
            }
            else {
                // Persistence must never fail a diagnosis the owner already paid
                // for: cache/save errors are logged, not thrown.
                try {
                    await store.putCachedDiagnosis(cacheKey, {
                        report: event.report,
                        model: event.model,
                        tier: event.tier,
                    });
                }
                catch (err) {
                    console.error(JSON.stringify({
                        event: "diagnosis_persistence_warning",
                        detail: err instanceof Error ? err.message : "unknown",
                    }));
                }
                await persistRecord(event.report);
                // Trace BEFORE the done yield: consumers stop iterating at done,
                // so anything after the yield is not guaranteed to run. The call
                // is a no-op when Langfuse is unwired and can never throw.
                await trace.recordSuccess({
                    model: event.model,
                    report: event.report,
                    usage: event.usage,
                    latency: event.latency,
                });
                yield {
                    type: "done",
                    report: event.report,
                    model: event.model,
                    tier: event.tier,
                    source: "model",
                    latency: {
                        ttftMs: Math.round(event.latency.ttftMs),
                        totalMs: Math.round(event.latency.totalMs),
                    },
                    quota: quotaAfter,
                    message: (0, quota_1.countdownMessage)(quotaAfter.remaining),
                };
            }
        }
    }
    catch (err) {
        await trace.recordError(err);
        throw err;
    }
}
