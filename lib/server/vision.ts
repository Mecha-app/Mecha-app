import { AiNotConfiguredError, isAiConfigured } from "./ai";
import {
  buildWarningLightPrompt,
  parseWarningLightResult,
  type WarningLightResult,
} from "./scan";

/**
 * Warning-light vision layer (Scan package, photo mode) — the same
 * provider pattern as the diagnosis layer (provider.ts): an interface,
 * the real Anthropic implementation, and a recording stub for tests.
 *
 * HONESTY RULE, same as the rest of the rebuild: when the AI layer is
 * not wired in this environment, getWarningLightProvider() returns
 * null and the route answers 501 — a photo result is NEVER fabricated.
 *
 * QUOTA RULE: identification is triage, not a diagnosis, so this layer
 * never touches the quota. Only /api/diagnose consumes, through
 * diagnoseService — there is no second consume path.
 */

export interface WarningLightImage {
  /** Base64-encoded image bytes (no data: prefix). */
  imageBase64: string;
  /** One of image/jpeg, image/png, image/webp, image/gif. */
  mediaType: string;
}

export interface WarningLightProvider {
  identify(image: WarningLightImage): Promise<WarningLightResult>;
}

export class VisionProviderError extends Error {
  readonly code = "vision_failed";
  constructor(message: string) {
    super(message);
    this.name = "VisionProviderError";
  }
}

/** Vision-capable tier: the same fast model as diagnosis triage. */
const VISION_MODEL = process.env.MECHA_MODEL_VISION ?? "claude-haiku-4-5";
const VISION_TIMEOUT_MS = 30_000;

export class AnthropicVisionProvider implements WarningLightProvider {
  constructor(private readonly apiKey: string) {}

  async identify(image: WarningLightImage): Promise<WarningLightResult> {
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          max_tokens: 1200,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: image.mediaType,
                    data: image.imageBase64,
                  },
                },
                { type: "text", text: buildWarningLightPrompt() },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
      });
    } catch {
      throw new VisionProviderError("The photo reader could not be reached.");
    }
    if (!res.ok) {
      throw new VisionProviderError(`The photo reader answered ${res.status}.`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
    try {
      return parseWarningLightResult(text);
    } catch {
      throw new VisionProviderError("The photo reader's answer could not be understood.");
    }
  }
}

/**
 * Recording stub — tests assert the route/service invoked the provider
 * exactly once and that identification consumed NO quota. Returns a
 * fixed, clearly-labelled fixture result.
 */
export class StubWarningLightProvider implements WarningLightProvider {
  readonly calls: WarningLightImage[] = [];

  constructor(
    private readonly result: WarningLightResult = {
      lights: [
        {
          name: "Check Engine Light",
          meaning:
            "The engine computer has stored a fault code. The light alone does not name the fault — a scan reads the code underneath it.",
          severity: "Moderate — Fix Soon",
        },
      ],
      odometerMiles: 123_456,
      note: "Stub fixture result.",
    },
  ) {}

  async identify(image: WarningLightImage): Promise<WarningLightResult> {
    this.calls.push(image);
    return this.result;
  }
}

/** Real provider when the AI layer is wired; null when it is not. */
export function getWarningLightProvider(): WarningLightProvider | null {
  if (!isAiConfigured()) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  return new AnthropicVisionProvider(apiKey);
}
