"use strict";
/**
 * Free-diagnosis quota (WP5) — the owner's hard rules, as code:
 *
 *   1. FIVE free diagnoses per account identity, LIFETIME. (This
 *      supersedes the legacy monthly counter — see db/migrations/0008.)
 *   2. The count lives ONLY on the server-side user record, keyed to the
 *      identity (email + normalized phone). It is never stored in the
 *      browser and never reset by signing out or signing up again.
 *   3. The quota is consumed BEFORE the AI provider is called (the
 *      consume itself is one atomic conditional UPDATE in the store),
 *      so a blocked user can never trigger a paid AI call.
 *   4. Every response states the countdown — how many free diagnoses
 *      remain — and at zero the message is plain and respectful.
 *
 * Pro plan = unlimited (the legacy check-limit used 999; WP5 implements
 * the bypass by plan, not by a magic number).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaExhaustedError = exports.FREE_DIAGNOSIS_LIMIT = void 0;
exports.quotaStateFor = quotaStateFor;
exports.countdownMessage = countdownMessage;
exports.FREE_DIAGNOSIS_LIMIT = 5;
function quotaStateFor(input) {
    if (input.plan === "pro") {
        return {
            plan: "pro",
            used: input.freeDiagnosesUsed,
            limit: null,
            remaining: null,
            canDiagnose: true,
            lifetime: true,
        };
    }
    const used = Math.max(0, input.freeDiagnosesUsed);
    const remaining = Math.max(0, exports.FREE_DIAGNOSIS_LIMIT - used);
    return {
        plan: "free",
        used,
        limit: exports.FREE_DIAGNOSIS_LIMIT,
        remaining,
        canDiagnose: remaining > 0,
        lifetime: true,
    };
}
/**
 * The countdown copy. Stated in EVERY diagnosis response (API + UI) —
 * after each diagnosis the user hears exactly where they stand.
 * At zero: plain, respectful, no dark patterns, no fake urgency.
 */
function countdownMessage(remaining) {
    if (remaining === null)
        return "Pro plan — unlimited diagnoses.";
    if (remaining > 1)
        return `You have ${remaining} free diagnoses left.`;
    if (remaining === 1)
        return "You have 1 free diagnosis left.";
    return ("You've used all 5 of your free diagnoses. " +
        "A MECHA Pro subscription is required to run more diagnoses — " +
        "nothing is charged until you choose a plan.");
}
class QuotaExhaustedError extends Error {
    code = "quota_exhausted";
    quota;
    constructor(quota) {
        super(countdownMessage(0));
        this.name = "QuotaExhaustedError";
        this.quota = quota;
    }
}
exports.QuotaExhaustedError = QuotaExhaustedError;
