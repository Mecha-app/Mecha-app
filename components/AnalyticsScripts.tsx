import { analyticsConfig } from "@/lib/analytics";
import { AnalyticsGate } from "./AnalyticsGate";

/**
 * Third-party measurement mount (analytics pass, 2026-11-18;
 * consent-gated 2026-11-19). ENV-GATED, the house pattern: GA4 is
 * configured only when NEXT_PUBLIC_GA_MEASUREMENT_ID holds a
 * well-formed id and Clarity only when NEXT_PUBLIC_CLARITY_PROJECT_ID
 * does — neither set, and this component renders NOTHING.
 *
 * CONSENT-GATED (cookie-consent pass): the vendor scripts are no
 * longer rendered into the head from here. This server component
 * reads the env config and hands the ids to AnalyticsGate, a client
 * component that loads the vendors ONLY after the visitor accepts
 * in the cookie banner — before a choice, and forever on Decline,
 * no analytics script is requested and no analytics cookie is set.
 * What the tools collect is stated on /privacy (§8).
 */
export function AnalyticsScripts() {
  const config = analyticsConfig();
  if (!config.gaId && !config.clarityId) return null;
  return <AnalyticsGate gaId={config.gaId} clarityId={config.clarityId} />;
}
