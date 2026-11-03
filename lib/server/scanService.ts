import { PHOTO_DISCLAIMER, type WarningLightResult } from "./scan";
import type { WarningLightImage, WarningLightProvider } from "./vision";

/**
 * Scan service (Scan package) — the server-side seam between the photo
 * route and the vision provider layer.
 *
 * Deliberately thin and deliberately QUOTA-FREE: identification is
 * triage. This function holds no store reference at all, so it cannot
 * consume a free diagnosis even by accident — the only consume path in
 * the product stays diagnoseService.executeDiagnosis, reached when the
 * driver taps "run the full diagnosis" and lands on /app/diagnose.
 */

export interface PhotoIdentification extends WarningLightResult {
  disclaimer: string;
}

export async function identifyWarningLights(
  provider: WarningLightProvider,
  image: WarningLightImage,
): Promise<PhotoIdentification> {
  const result = await provider.identify(image);
  return { ...result, disclaimer: PHOTO_DISCLAIMER };
}
