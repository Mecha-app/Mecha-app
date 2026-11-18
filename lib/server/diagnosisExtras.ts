/**
 * Diagnosis presentation helpers (Pass #20) — pure functions over a
 * finished DiagnosisReport, shared by the diagnose page, the public
 * share card, and the tests so every surface frames a result the
 * same way:
 *
 *   1. THE SEVERITY HEADLINE (the FIXD lesson): a result LEADS with
 *      the safe-to-drive verdict, not a small pill beside it. Three
 *      bands, mapped from the report's own severity + safeToDriver —
 *      safety always wins: a report that says "do not drive" is the
 *      stop band whatever its severity label says.
 *
 *   2. "WHAT TO TELL THE SHOP" (the AIMECH lesson): a short script
 *      the driver can read or show at the counter, built by TEMPLATE
 *      from the report's own fields — no AI call, no new claims.
 *      The script speaks the standing quote-check language: a quote
 *      is "within range" or "above the estimate range", and the
 *      move is to "ask the shop to explain" — never "rip-off".
 */
import type { DiagnosisReport } from "./ai";

export type DriveBand = "stop" | "caution" | "go";

export interface DriveVerdict {
  band: DriveBand;
  /** The headline itself — the first thing a stranded driver reads. */
  headline: string;
  /** One supporting line under the headline. */
  detail: string;
}

export function driveVerdict(report: Pick<DiagnosisReport, "severity" | "safeToDriver">): DriveVerdict {
  if (!report.safeToDriver || report.severity === "Critical") {
    return {
      band: "stop",
      headline: "Do not drive — get help now",
      detail:
        "This can make the car unsafe or cause serious damage. Call a tow or a shop before moving it.",
    };
  }
  if (report.severity === "Moderate — Fix Soon") {
    return {
      band: "caution",
      headline: "Drive only if necessary",
      detail: "Get this repaired within the next few days — it will not heal itself, and waiting can raise the bill.",
    };
  }
  return {
    band: "go",
    headline: "Safe to keep driving",
    detail: "Keep an eye on it and mention it at your next service — if it gets worse, run a fresh diagnosis.",
  };
}

/** The report's first sentence, trimmed to a length a person can say out loud. */
export function firstSentence(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const end = clean.indexOf(". ");
  const sentence = end > 0 ? clean.slice(0, end + 1) : clean;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The counter script: 3–5 plain sentences assembled from the report.
 * Every sentence is conditional on the field that feeds it existing —
 * a report without parts or a cost range simply gets a shorter
 * script, never a fabricated one.
 */
export function buildShopScript(
  report: DiagnosisReport,
  vehicleInfo?: string | null,
): string[] {
  const lines: string[] = [];
  const car = vehicleInfo?.trim() ? vehicleInfo.trim() : "my car";
  lines.push(`This is about ${car}. ${firstSentence(report.diagnosis)}`);

  const likelyPart =
    report.parts.find((p) => p.likelihood === "likely") ?? report.parts[0] ?? null;
  if (likelyPart) {
    lines.push(
      `The most likely fix involves the ${likelyPart.name.toLowerCase()} — please confirm that's the fault before replacing anything.`,
    );
  }

  if (report.estimatedCost) {
    lines.push(
      `MECHA's fair range for this repair is $${report.estimatedCost.min}–$${report.estimatedCost.max}. ` +
        `If your quote lands above the estimate range, I'll ask the shop to explain what makes it different before I approve it.`,
    );
  }

  const verdict = driveVerdict(report);
  if (verdict.band === "stop") {
    lines.push("The car should not be driven, so I need a tow to the shop.");
  } else if (verdict.band === "caution") {
    lines.push("I'm looking to book this in within the next few days.");
  }

  lines.push("Please walk me through the quote line by line before any work starts.");
  return lines;
}

/** The fields the public share card renders — nothing beyond the report itself. */
export interface ShareCardData {
  vehicle: string;
  headline: string;
  band: DriveBand;
  summary: string;
  costLabel: string | null;
  partNames: string[];
  createdAt: string;
}

export function buildShareCard(input: {
  vehicleInfo: string | null;
  problemText: string | null;
  report: DiagnosisReport;
  createdAt: string;
}): ShareCardData {
  const verdict = driveVerdict(input.report);
  return {
    vehicle: input.vehicleInfo?.trim() || "Vehicle",
    headline: verdict.headline,
    band: verdict.band,
    summary: firstSentence(input.report.diagnosis, 320),
    costLabel: input.report.estimatedCost
      ? `$${input.report.estimatedCost.min}–$${input.report.estimatedCost.max}`
      : null,
    partNames: input.report.parts.slice(0, 4).map((p) => p.name),
    createdAt: input.createdAt,
  };
}
