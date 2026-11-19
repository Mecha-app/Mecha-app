"use client";

import { useEffect, useMemo } from "react";
import { analyticsSnippets, type AnalyticsConfig } from "@/lib/analytics";
import {
  disableAnalytics,
  loadAnalytics,
  onConsentChanged,
  readConsentChoice,
} from "@/lib/client/consent";

/**
 * The consent gate for third-party measurement (cookie-consent pass,
 * 2026-11-19). The root layout mounts this with the env-gated ids
 * instead of rendering the vendor scripts itself: nothing is loaded
 * until the visitor accepts in the cookie banner. On Accept it
 * injects the exact payloads analyticsSnippets builds (the same
 * strings the old server-rendered head carried); on Decline it
 * never injects, so GA/Clarity set no cookies at all. A switch back
 * to Decline stops events (trackEvent re-checks the choice) and
 * trips GA's ga-disable flag. Clarity rides the same gate, so when
 * its project id is configured it follows the identical rule.
 */
export function AnalyticsGate({
  gaId,
  clarityId,
}: Pick<AnalyticsConfig, "gaId" | "clarityId">) {
  const snippets = useMemo(
    () => analyticsSnippets({ gaId, clarityId, gscToken: null }),
    [gaId, clarityId],
  );

  useEffect(() => {
    const apply = () => {
      const choice = readConsentChoice();
      if (choice === "accepted") loadAnalytics(snippets);
      else if (choice === "declined") disableAnalytics(gaId);
    };
    apply();
    return onConsentChanged(apply);
  }, [snippets, gaId]);

  return null;
}
