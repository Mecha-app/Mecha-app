import { analyticsConfig, analyticsSnippets } from "@/lib/analytics";

/**
 * Third-party measurement scripts (analytics pass, 2026-11-18),
 * rendered in the root layout's <head> next to ThemeScript, in the
 * same raw-script pattern. ENV-GATED, the house pattern: GA4 loads
 * only when NEXT_PUBLIC_GA_MEASUREMENT_ID holds a well-formed id and
 * Clarity only when NEXT_PUBLIC_CLARITY_PROJECT_ID does — neither
 * set, and this component renders NOTHING: no tags, no requests, no
 * console errors. Setting the vars in Vercel and redeploying is the
 * whole switch. The payloads themselves are built by the pure,
 * unit-tested analyticsSnippets (lib/analytics).
 *
 * What they collect is stated on /privacy (§8): GA counts visits and
 * the funnel steps the app reports (diagnosis started/finished,
 * paywall seen, checkout, purchase — event names and a product word
 * only, never diagnosis text, photos, or VINs); Clarity records
 * clicks, scrolls, and session replays.
 */
export function AnalyticsScripts() {
  const snippets = analyticsSnippets(analyticsConfig());
  return (
    <>
      {snippets.gaLoaderSrc && <script async src={snippets.gaLoaderSrc} />}
      {snippets.gaConfigScript && (
        <script dangerouslySetInnerHTML={{ __html: snippets.gaConfigScript }} />
      )}
      {snippets.clarityScript && (
        <script dangerouslySetInnerHTML={{ __html: snippets.clarityScript }} />
      )}
    </>
  );
}
