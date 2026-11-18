"use strict";
/**
 * Scan domain logic (Scan package — blueprint routes 3 + 13).
 *
 * PURE module on purpose: no imports, no I/O, no env. The same
 * functions run in three places that must agree exactly —
 *   1. the /app/scan client page (validation + handoff prefill text),
 *   2. the /api/scan/photo route (defensive parsing of vision output),
 *   3. the test suite (quota + handoff contracts).
 *
 * QUOTA INVARIANT (owner's hard rule): nothing in this module — and
 * nothing in the photo route — consumes a free diagnosis. A scan
 * becomes a diagnosis ONLY by handing a prefill to /app/diagnose,
 * whose /api/diagnose call runs the single consume path inside
 * diagnoseService.executeDiagnosis. Identification is triage.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHOTO_DISCLAIMER = exports.LIGHT_SEVERITIES = exports.RETURN_TO_KEY = exports.DIAGNOSE_PREFILL_KEY = void 0;
exports.buildWarningLightPrompt = buildWarningLightPrompt;
exports.parseWarningLightResult = parseWarningLightResult;
exports.buildPhotoDiagnosisPrefill = buildPhotoDiagnosisPrefill;
exports.validateFaultCode = validateFaultCode;
exports.faultCodeInfo = faultCodeInfo;
exports.buildCodeDiagnosisPrefill = buildCodeDiagnosisPrefill;
exports.buildVinVehicleInfo = buildVinVehicleInfo;
exports.buildVinDiagnosisPrefill = buildVinDiagnosisPrefill;
/** sessionStorage key carrying a scan's handoff into /app/diagnose. */
exports.DIAGNOSE_PREFILL_KEY = "mecha-diagnose-prefill";
/** sessionStorage key carrying the post-auth return destination. */
exports.RETURN_TO_KEY = "mecha-return-to";
exports.LIGHT_SEVERITIES = [
    "Critical",
    "Moderate — Fix Soon",
    "Minor — Monitor",
];
exports.PHOTO_DISCLAIMER = "MECHA identified these lights from your photo. A photo shows which light is on — not the fault underneath it. " +
    "Treat this as triage: the full diagnosis, or a mechanic's scan tool, confirms the actual cause.";
function buildWarningLightPrompt() {
    return [
        "You are MECHA's dashboard reader. Look at this photo of a car's instrument cluster and identify every warning or indicator light that is illuminated.",
        "",
        "Return ONLY a JSON object (no markdown, no commentary) with this exact shape:",
        '{"lights":[{"name":"...","meaning":"...","severity":"Critical"}],"odometerMiles":123456,"note":"..."}',
        "",
        "Rules:",
        '- "name": the standard name of the light (e.g. "Check Engine Light", "Oil Pressure Warning", "Battery / Charging System", "Brake System Warning", "ABS Warning", "Tire Pressure (TPMS)", "Coolant Temperature Warning", "Airbag (SRS) Warning", "Traction Control", "Low Fuel"). If a symbol is unclear, describe the symbol instead of guessing a name.',
        '- "meaning": 1–2 plain sentences on what this light indicates on a typical car. NEVER claim the underlying fault — a light alone does not prove a cause.',
        '- "severity": exactly one of "Critical", "Moderate — Fix Soon", "Minor — Monitor". Red stop-now lights (oil pressure, coolant temperature, brake system) are Critical; amber warnings needing prompt attention (check engine, ABS, airbag) are Moderate — Fix Soon; information lights (steady tire-pressure, low fuel) are Minor — Monitor.',
        '- "odometerMiles": the odometer reading if legible in the photo, otherwise null. Never estimate it.',
        '- "note": brief context — e.g. many lights lit with the engine off is a normal bulb check; poor photo quality; or, if this is not a dashboard photo, say so and return "lights": [].',
        "Never invent a light that is not visibly illuminated.",
    ].join("\n");
}
function coerceSeverity(raw) {
    if (typeof raw === "string") {
        const s = raw.toLowerCase();
        if (s.includes("critical"))
            return "Critical";
        if (s.includes("moderate") || s.includes("soon"))
            return "Moderate — Fix Soon";
        if (s.includes("minor") || s.includes("monitor"))
            return "Minor — Monitor";
    }
    return "Moderate — Fix Soon";
}
/**
 * Defensive parse of the vision model's JSON (same posture as
 * ai.parseReport): extract the object, validate every field, coerce
 * what is safely coercible, throw on anything unusable so the route
 * can answer honestly instead of showing a fabricated result.
 */
function parseWarningLightResult(rawText) {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Vision response carried no JSON object.");
    }
    const parsed = JSON.parse(rawText.slice(start, end + 1));
    const lights = [];
    if (Array.isArray(parsed.lights)) {
        for (const item of parsed.lights.slice(0, 8)) {
            if (item === null || typeof item !== "object")
                continue;
            const rec = item;
            const name = typeof rec.name === "string" ? rec.name.trim().slice(0, 120) : "";
            const meaning = typeof rec.meaning === "string" ? rec.meaning.trim().slice(0, 600) : "";
            if (!name || !meaning)
                continue;
            lights.push({ name, meaning, severity: coerceSeverity(rec.severity) });
        }
    }
    const odo = parsed.odometerMiles;
    const odometerMiles = typeof odo === "number" && Number.isFinite(odo) && odo > 0 && odo <= 3_000_000
        ? Math.round(odo)
        : null;
    const note = typeof parsed.note === "string" ? parsed.note.trim().slice(0, 500) : "";
    return { lights, odometerMiles, note };
}
/** Handoff: photo identification → a full diagnosis (the quota path). */
function buildPhotoDiagnosisPrefill(lights, vehicleInfo, vehicleId) {
    const names = lights.map((l) => l.name).join(", ");
    return {
        problem: `My dashboard shows these warning lights: ${names}. ` +
            "Explain what each light most likely means on this vehicle, what could be causing them " +
            "(especially if several share one cause), how urgent it is, whether it is safe to keep " +
            "driving, and what a fair repair price looks like.",
        ...(vehicleInfo?.trim() ? { vehicleInfo: vehicleInfo.trim() } : {}),
        ...(vehicleId ? { vehicleId } : {}),
    };
}
/* ------------------------------------------------------------------ */
/* OBD fault codes (code mode)                                         */
/* ------------------------------------------------------------------ */
/**
 * OBD-II DTC shape: system letter (P/B/C/U), a digit, then three hex
 * characters — P0420 is the canonical example.
 */
const FAULT_CODE_RE = /^[PBCU][0-9][0-9A-F]{3}$/;
function validateFaultCode(raw) {
    const code = raw.trim().toUpperCase().replace(/[\s-]+/g, "");
    return FAULT_CODE_RE.test(code) ? code : null;
}
const SYSTEM_BY_LETTER = {
    P: "Powertrain",
    B: "Body",
    C: "Chassis",
    U: "Network",
};
function faultCodeInfo(code) {
    return {
        code,
        system: SYSTEM_BY_LETTER[code[0]] ?? "Powertrain",
        // OBD-II: a '1' in the second position is manufacturer-specific;
        // 0, 2 and 3 are SAE-standard (generic) ranges.
        scope: code[1] === "1" ? "manufacturer" : "generic",
    };
}
/** Handoff: a typed code → the diagnosis that explains it (quota path). */
function buildCodeDiagnosisPrefill(code, vehicleInfo, vehicleId) {
    const info = faultCodeInfo(code);
    const scopeText = info.scope === "generic" ? "a standard OBD-II code" : "a manufacturer-specific code";
    return {
        problem: `A code reader reported diagnostic trouble code ${code} — ${info.system.toLowerCase()} system, ${scopeText}. ` +
            "Explain in plain language what this code means on this vehicle, the most likely causes " +
            "ranked in order, how urgent it is, whether it is safe to keep driving, and the fair " +
            "price to fix the most likely cause.",
        ...(vehicleInfo?.trim() ? { vehicleInfo: vehicleInfo.trim() } : {}),
        ...(vehicleId ? { vehicleId } : {}),
    };
}
/**
 * The decoded VIN becomes the diagnosis vehicle line, e.g.
 * "2019 Honda Accord EX-L (1.5L I4 DOHC 16V)". Mirrors how
 * vehicleService composes a vehicle's display name from the same
 * fields, so the diagnose page, the vault, and the scan agree.
 */
function buildVinVehicleInfo(decoded) {
    const head = [decoded.year, decoded.make, decoded.model, decoded.trim]
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean)
        .join(" ");
    const engine = typeof decoded.engine === "string" ? decoded.engine.trim() : "";
    if (!head)
        return engine;
    return engine ? `${head} (${engine})` : head;
}
/** Handoff: a decoded vehicle → diagnose page with the car prefilled. */
function buildVinDiagnosisPrefill(decoded) {
    return { problem: "", vehicleInfo: buildVinVehicleInfo(decoded) };
}
