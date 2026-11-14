# MECHA eval sandbox — Hugging Face + Replicate trials

**SANDBOX ONLY.** Everything in `scripts/evals/` is an evaluation tool. It is
never customer-facing, is never imported by the app, and must never be wired
into any production path. It exists to answer one question with evidence.

## Purpose

MECHA's production AI today:

- **Diagnosis text** — Claude models (triage = `claude-haiku-4-5`,
  deep = Sonnet-class) via the Anthropic/OpenRouter providers.
- **Dashboard-photo warning-light identification** — an Anthropic vision
  provider (same Haiku-class model).

The eval question: can open models served by **Hugging Face Inference** or
**Replicate** beat or match that stack on —

- **(a) voice-note transcription** for spoken problem descriptions, and
- **(b) vehicle-photo / dashboard warning-light analysis**

— on **accuracy, latency, and cost**?

## The scripts

Plain Node scripts (`.mjs`, Node 18+ global `fetch`, **no dependencies**).
Every script prints, per run: the model id, wall-clock latency in ms, the raw
result (transcript or analysis text), and a rough cost note (usage /
`predict_time` basis where the API returns it, otherwise
"cost: see provider dashboard").

| Script | Trial | Model |
| --- | --- | --- |
| `transcribe-hf.mjs` | HF transcription | `openai/whisper-large-v3` via HF Inference router |
| `transcribe-replicate.mjs` | Replicate transcription | `openai/whisper` (version from env — see below) |
| `photo-hf.mjs` | HF vision | `Qwen/Qwen2.5-VL-7B-Instruct` via HF router chat completions (default; overridable) |
| `photo-replicate.mjs` | Replicate vision | Vision-language model of your choice (version from env) |

## Environment variables

No key is ever hardcoded. When a required variable is absent, the script
prints a clear `not configured` message naming the missing variable and
**exits 0 without making any network call**.

| Variable | Used by | Notes |
| --- | --- | --- |
| `HF_API_KEY` | `transcribe-hf.mjs`, `photo-hf.mjs` | Hugging Face token with **Inference Providers** permission. |
| `REPLICATE_API_TOKEN` | `transcribe-replicate.mjs`, `photo-replicate.mjs` | Replicate API token. |
| `REPLICATE_WHISPER_VERSION` | `transcribe-replicate.mjs` | **Required** when the token is set. Copy the current `openai/whisper` version id from its Replicate API tab. Deliberately not pinned in code: published hashes for this model conflict, and a guessed hash would evaluate the wrong build. |
| `REPLICATE_VISION_VERSION` | `photo-replicate.mjs` | **Required** when the token is set. Version id (`owner/model:version` or bare hash) of the vision model you picked on Replicate. Not pinned for the same reason. |
| `HF_WHISPER_MODEL` | `transcribe-hf.mjs` | Optional override. Default `openai/whisper-large-v3`. |
| `HF_VISION_MODEL` | `photo-hf.mjs` | Optional override. Default `Qwen/Qwen2.5-VL-7B-Instruct`. Note: that model's live serving through the HF Inference Providers router depends on provider availability — if the router reports no provider for it, set this to a vision model the router currently serves. |
| `REPLICATE_TIMEOUT_MS` | Replicate scripts | Optional poll timeout. Default `180000`. |
| `REPLICATE_POLL_MS` | Replicate scripts | Optional poll interval. Default `2000`. |
| `REPLICATE_VISION_IMAGE_KEY` / `REPLICATE_VISION_PROMPT_KEY` | `photo-replicate.mjs` | Optional input-key overrides (defaults `image` / `prompt`) for vision models with different schemas. |

## How to run

From the repo root, with fixtures in place (see `fixtures/README.md`):

```bash
# Hugging Face — transcription
HF_API_KEY=... node scripts/evals/transcribe-hf.mjs scripts/evals/fixtures/voice-01-brakes-en.mp3

# Replicate — transcription
REPLICATE_API_TOKEN=... REPLICATE_WHISPER_VERSION=... \
  node scripts/evals/transcribe-replicate.mjs scripts/evals/fixtures/voice-01-brakes-en.mp3

# Hugging Face — dashboard photo (default question = warning lights)
HF_API_KEY=... node scripts/evals/photo-hf.mjs scripts/evals/fixtures/dash-01-check-engine.jpg

# …with a custom question
HF_API_KEY=... node scripts/evals/photo-hf.mjs scripts/evals/fixtures/dash-01-check-engine.jpg "What is the odometer reading?"

# Replicate — dashboard photo
REPLICATE_API_TOKEN=... REPLICATE_VISION_VERSION=... \
  node scripts/evals/photo-replicate.mjs scripts/evals/fixtures/dash-01-check-engine.jpg
```

Sanity check (no keys, no network): run any script with its key unset — it
prints `not configured: <VAR> is not set … No network call was made.` and
exits 0.

## Endpoints used

- **HF transcription:** `POST https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3`
  with the raw audio bytes as the body (the reliable shape for this ASR
  endpoint) — response JSON `{ text, chunks? }`.
- **HF vision:** `POST https://router.huggingface.co/v1/chat/completions`
  (OpenAI-compatible router), image sent as a base64 data URI in an
  `image_url` content part; token usage read from the response `usage`.
- **Replicate (both):** `POST https://api.replicate.com/v1/predictions` with
  `{ version, input }`, then poll `GET https://api.replicate.com/v1/predictions/{id}`
  through `starting → processing → succeeded | failed | canceled` until the
  timeout. Inputs are base64 data URIs. Replicate bills by hardware seconds;
  the scripts report `metrics.predict_time` as the cost basis.

## Eval protocol

1. **Fixtures first.** Build the fixture set and write
   `fixtures/ground-truth.json` BEFORE running any model (see
   `fixtures/README.md` for the file list, the exact schema, and a filled
   example). Never edit ground truth after seeing results.
2. **Same fixtures, every system.** Run the identical fixture files through:
   - the current production stack (Claude triage/vision, in its normal app
     context — note its model, latency, and token usage by hand), and
   - each of the four trials above.
   Change nothing between systems: same audio, same photos, same default
   question for photos.
3. **Score blind where possible.** Score accuracy 0–2 per fixture against
   ground truth using the rubric in `fixtures/README.md` (the scoring-sheet
   format lives there too). Record accuracy, `latency_ms`, and the cost note
   for every run.
4. **Repeat for latency.** Run each fixture at least twice per system; report
   the median latency and note cold starts rather than dropping them.
5. **Decide per capability.** Transcription and vision are separate
   decisions — a win on one says nothing about the other.

### Decision rule (owner's stack plan, P5)

**A trial replaces nothing until it ties-or-beats the current Claude stack on
accuracy at lower cost.** Latency is reported and can break a tie, but lower
latency alone never justifies a switch, and cheaper alone never justifies an
accuracy loss. If no trial clears the bar, the result of the eval is "keep
the current stack" — that is a valid, expected outcome, and this sandbox
stays a sandbox.

## Standing rule

Sandbox only — nothing here is wired into the app. No script in this
directory may be imported by application code, added to a build, or pointed
at real customer audio/photos. If a trial ever wins under the decision rule,
moving it into production is a separate, explicitly approved change — not a
follow-up edit to these scripts.
