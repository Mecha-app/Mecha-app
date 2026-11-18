import { ValidationError } from "./authService";
import { NotFoundError } from "./errors";
import type { DiagnosisReport } from "./ai";
import { buildShareCard, buildShopScript, type ShareCardData } from "./diagnosisExtras";
import type { DiagnosisOutcome, DiagnosisRecord, IdentityStore } from "./store";

/**
 * Share + outcome service (Pass #20) — the two doors that open AFTER
 * a diagnosis exists:
 *
 *   SHARE — the owner mints a public, token-guarded card for one of
 *   THEIR diagnoses (the TorqueBot Build-Card lesson: a result
 *   pretty enough to send is distribution). Ownership is enforced
 *   here, not in the route: another driver's diagnosis id answers
 *   NotFoundError, indistinguishable from a missing one. The public
 *   side resolves a token to the card data only — the record's
 *   owner, email, and account never leave the server.
 *
 *   OUTCOME — the owner records what actually fixed the car and
 *   what it cost (the CarMD seed). One outcome per diagnosis,
 *   replaceable by its owner, never public.
 */

async function ownedDiagnosis(
  store: IdentityStore,
  userId: string,
  diagnosisId: string,
): Promise<DiagnosisRecord> {
  const record = await store.findDiagnosisRecord(diagnosisId);
  if (!record || record.userId !== userId) throw new NotFoundError("Diagnosis not found.");
  return record;
}

export async function createShare(
  store: IdentityStore,
  userId: string,
  diagnosisId: string,
): Promise<{ token: string }> {
  await ownedDiagnosis(store, userId, diagnosisId);
  return store.createDiagnosisShare(diagnosisId);
}

/** Public resolution: token → card data + counter script, or null. No owner data, ever. */
export async function resolveShareCard(
  store: IdentityStore,
  token: string,
): Promise<{ card: ShareCardData; script: string[] } | null> {
  if (typeof token !== "string" || token.length < 16 || token.length > 128) return null;
  const record = await store.findDiagnosisByShareToken(token);
  if (!record || !record.aiResult || typeof record.aiResult !== "object") return null;
  const report = record.aiResult as DiagnosisReport;
  if (typeof report.diagnosis !== "string" || typeof report.safeToDriver !== "boolean") return null;
  return {
    card: buildShareCard({
      vehicleInfo: record.vehicleInfo,
      problemText: record.problemText,
      report,
      createdAt: record.createdAt,
    }),
    script: buildShopScript(report, record.vehicleInfo),
  };
}

function cleanWhatFixed(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError('"whatFixed" must be a short description of the repair.');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 300) {
    throw new ValidationError('"whatFixed" must be between 1 and 300 characters.');
  }
  return trimmed;
}

function parseCostUsd(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
    throw new ValidationError('"costUsd" must be a whole-dollar amount between 0 and 1,000,000.');
  }
  return Math.round(n);
}

function parseRating(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new ValidationError('"rating" must be a whole number of stars between 1 and 5.');
  }
  return n;
}

export async function recordOutcome(
  store: IdentityStore,
  userId: string,
  diagnosisId: string,
  body: Record<string, unknown>,
): Promise<DiagnosisOutcome> {
  await ownedDiagnosis(store, userId, diagnosisId);
  return store.saveDiagnosisOutcome({
    diagnosisId,
    whatFixed: cleanWhatFixed(body.whatFixed),
    costUsd: parseCostUsd(body.costUsd),
    rating: parseRating(body.rating),
    // Permission is opt-in only: anything but an explicit true is false.
    quotePermission: body.quotePermission === true,
  });
}

export async function readOutcome(
  store: IdentityStore,
  userId: string,
  diagnosisId: string,
): Promise<DiagnosisOutcome | null> {
  await ownedDiagnosis(store, userId, diagnosisId);
  return store.getDiagnosisOutcome(diagnosisId);
}

/**
 * One saved diagnosis, read back whole for its owner (Pass #20b) —
 * the record behind the detail view (/app/diagnoses/[id]). The
 * detail page renders the STORED record — the same object the
 * history lists and the share card are built from — so the range
 * and verdict a driver sees there are the run's own, never a
 * re-derivation. Another driver's id answers NotFoundError,
 * indistinguishable from a missing one; the saved outcome rides
 * along (null until the driver records one).
 */
export async function readDiagnosisDetail(
  store: IdentityStore,
  userId: string,
  diagnosisId: string,
): Promise<{
  diagnosis: DiagnosisRecord;
  outcome: DiagnosisOutcome | null;
  shareToken: string | null;
}> {
  const diagnosis = await ownedDiagnosis(store, userId, diagnosisId);
  const outcome = await store.getDiagnosisOutcome(diagnosisId);
  // The existing share link rides along (Pass #20c): a driver who
  // minted one and comes back to this diagnosis sees the link that
  // exists, not a fresh "create" offer for the same link.
  const shareToken = await store.findDiagnosisShareToken(diagnosisId);
  return { diagnosis, outcome, shareToken };
}
