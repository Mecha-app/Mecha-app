/**
 * Plan intent (conversion pass, 2026-11-20) — how a pricing choice
 * survives signup. The /pricing cards' CTAs record the plan the
 * visitor picked ("pro" | "single") before sending them to
 * /register?plan=…; after any sign-in door lands them in the app,
 * the destination helpers route them to the dashboard's billing
 * card (/app#billing), and BillingSection reads the intent once to
 * highlight the matching purchase card, then clears it.
 *
 * localStorage (not sessionStorage): the Google door leaves the
 * site and comes back through a callback — the intent has to
 * survive that round trip in the same browser.
 */
export type PlanIntent = "pro" | "single";

const PLAN_INTENT_KEY = "mecha-plan-intent";

export function savePlanIntent(intent: PlanIntent): void {
  try {
    localStorage.setItem(PLAN_INTENT_KEY, intent);
  } catch {
    // Storage unavailable — the ?plan= query on the register URL
    // still carries the intent into signup.
  }
}

export function readPlanIntent(): PlanIntent | null {
  try {
    const value = localStorage.getItem(PLAN_INTENT_KEY);
    return value === "pro" || value === "single" ? value : null;
  } catch {
    return null;
  }
}

export function clearPlanIntent(): void {
  try {
    localStorage.removeItem(PLAN_INTENT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Capture the ?plan= query a pricing CTA put on the auth URL, so
 * the intent exists even where the click handler's localStorage
 * write was unavailable. Called on mount by /register and /login.
 */
export function capturePlanIntentFromUrl(): void {
  try {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (plan === "pro" || plan === "single") savePlanIntent(plan);
  } catch {
    // No URL to read — the click handler's write stands.
  }
}

/**
 * The post-sign-in destination when a plan intent is pending: the
 * dashboard's billing card, where the chosen purchase is
 * highlighted. Returns null when no intent is pending, so each
 * door's own default applies.
 */
export function planIntentDestination(): string | null {
  return readPlanIntent() ? "/app#billing" : null;
}
