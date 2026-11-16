#!/usr/bin/env node
/**
 * MECHA eval sandbox — Replicate vision / warning-light trial.
 *
 * SANDBOX ONLY: evaluation tool. Never customer-facing, never imported by the app.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=... REPLICATE_VISION_VERSION=... \
 *     node scripts/evals/photo-replicate.mjs <image-file> [question]
 *
 * Creates a Replicate prediction for a vision-language model, polls until it
 * succeeds/fails (with a timeout), and prints the answer, wall-clock latency,
 * and a rough cost note. The image is passed as a base64 data URI, and the
 * default question is MECHA's real production question (dashboard warning
 * lights).
 *
 * API (verified 2026-11-14 from Replicate's HTTP reference):
 *   POST https://api.replicate.com/v1/predictions        { version, input }
 *   GET  https://api.replicate.com/v1/predictions/{id}   poll `status`:
 *        starting -> processing -> succeeded | failed | canceled
 *   Auth: Authorization: Bearer $REPLICATE_API_TOKEN
 *
 * Why the version comes from the environment: Replicate vision models are
 * community models pinned by 64-char version hashes that change as authors
 * publish new builds, and no single canonical vision model/version could be
 * verified at writing time — so none is invented here. Pick a current
 * vision-language model on replicate.com (e.g. a LLaVA / Qwen-VL class model
 * from the "vision" / image-to-text collections), copy its version id from
 * its API tab, and set:
 *   REPLICATE_VISION_VERSION=<owner/model:version-id or bare version id>
 *
 * Input schema note: most Replicate vision models accept
 *   { image: <data URI>, prompt: <text> }
 * which is what this script sends. A few models use different key names
 * (e.g. `question` instead of `prompt`). If yours does, override with:
 *   REPLICATE_VISION_PROMPT_KEY=question
 *   REPLICATE_VISION_IMAGE_KEY=image   (default)
 *
 * Env:
 *   REPLICATE_API_TOKEN      (required) Replicate API token.
 *   REPLICATE_VISION_VERSION (required) Vision model version id. See above.
 *   REPLICATE_TIMEOUT_MS     (optional) Poll timeout. Default: 180000 (3 min).
 *   REPLICATE_POLL_MS        (optional) Poll interval. Default: 2000.
 *
 * No dependencies. Node 18+ (global fetch).
 */

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const CREATE_URL = 'https://api.replicate.com/v1/predictions';

const DEFAULT_QUESTION =
  'Identify any illuminated dashboard warning lights in this photo and explain each in one plain sentence.';

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // Env gates FIRST: missing config -> clear message, exit 0, no network call.
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    console.log(
      'not configured: REPLICATE_API_TOKEN is not set. ' +
        'Set REPLICATE_API_TOKEN to your Replicate API token and re-run. ' +
        'No network call was made.'
    );
    process.exit(0);
  }

  const version = process.env.REPLICATE_VISION_VERSION;
  if (!version) {
    console.log(
      'not configured: REPLICATE_VISION_VERSION is not set. ' +
        'No vision-model version is pinned in this script on purpose (Replicate version hashes change). ' +
        'Pick a current vision-language model on replicate.com, copy its version id from its API tab, ' +
        'and set REPLICATE_VISION_VERSION=<version id>, then re-run. ' +
        'No network call was made.'
    );
    process.exit(0);
  }

  const imageFile = process.argv[2];
  const question = process.argv.slice(3).join(' ') || DEFAULT_QUESTION;
  if (!imageFile) {
    console.error('usage: node scripts/evals/photo-replicate.mjs <image-file> [question]');
    process.exit(1);
  }

  let imageBytes;
  try {
    imageBytes = await readFile(imageFile);
  } catch (err) {
    console.error(`error: could not read image file "${imageFile}": ${err.message}`);
    process.exit(1);
  }

  const mime = MIME_BY_EXT[extname(imageFile).toLowerCase()] || 'image/jpeg';
  const imageDataUri = `data:${mime};base64,${imageBytes.toString('base64')}`;

  const imageKey = process.env.REPLICATE_VISION_IMAGE_KEY || 'image';
  const promptKey = process.env.REPLICATE_VISION_PROMPT_KEY || 'prompt';

  const timeoutMs = Number(process.env.REPLICATE_TIMEOUT_MS || 180000);
  const pollMs = Number(process.env.REPLICATE_POLL_MS || 2000);

  console.log(`model: vision model (version from REPLICATE_VISION_VERSION)`);
  console.log(`version: ${version}`);
  console.log(`endpoint: ${CREATE_URL}`);
  console.log(`input: ${imageFile} (${imageBytes.length} bytes, sent as base64 data URI)`);
  console.log(`question: ${question}`);

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };

  const started = Date.now();

  // --- Create the prediction -------------------------------------------------
  let createResponse;
  try {
    createResponse = await fetch(CREATE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        version,
        input: {
          [imageKey]: imageDataUri,
          [promptKey]: question,
        },
      }),
    });
  } catch (err) {
    console.error(`error: create prediction request failed: ${err.message}`);
    process.exit(1);
  }

  const created = await createResponse.json().catch(() => null);
  if (!createResponse.ok || !created) {
    console.error(`error: HTTP ${createResponse.status} creating prediction`);
    console.error(`response: ${JSON.stringify(created)}`);
    process.exit(1);
  }

  console.log(`prediction: ${created.id} (status: ${created.status})`);
  const pollUrl =
    (created.urls && created.urls.get) || `${CREATE_URL}/${created.id}`;

  // --- Poll until terminal state or timeout ----------------------------------
  let prediction = created;
  while (
    prediction.status !== 'succeeded' &&
    prediction.status !== 'failed' &&
    prediction.status !== 'canceled'
  ) {
    if (Date.now() - started > timeoutMs) {
      console.error(
        `error: timed out after ${timeoutMs} ms waiting for prediction ${created.id} ` +
          `(last status: ${prediction.status})`
      );
      console.error(`latency_ms: ${Date.now() - started}`);
      process.exit(1);
    }
    await sleep(pollMs);
    const pollResponse = await fetch(pollUrl, { headers });
    if (!pollResponse.ok) {
      console.error(`error: HTTP ${pollResponse.status} polling prediction ${created.id}`);
      process.exit(1);
    }
    prediction = await pollResponse.json();
  }

  const latencyMs = Date.now() - started;
  console.log(`latency_ms: ${latencyMs}`);
  console.log(`status: ${prediction.status}`);

  if (prediction.status !== 'succeeded') {
    console.error(`error: prediction did not succeed: ${prediction.error || '(no error detail)'}`);
    console.error(`result (raw JSON): ${JSON.stringify(prediction, null, 2)}`);
    process.exit(1);
  }

  // Vision outputs vary by model: a plain string, an array of string chunks
  // (streamed models), or an object. Print the raw output AND a flattened
  // answer when it is text-shaped.
  console.log('result (raw JSON):');
  console.log(JSON.stringify(prediction.output ?? prediction, null, 2));

  const output = prediction.output;
  let answer = null;
  if (typeof output === 'string') answer = output;
  else if (Array.isArray(output) && output.every((c) => typeof c === 'string')) answer = output.join('');
  if (answer) {
    console.log('answer:');
    console.log(answer);
  }

  // Cost note: Replicate bills public models by hardware seconds;
  // `metrics.predict_time` is the billing basis when present.
  const predictTime = prediction.metrics && prediction.metrics.predict_time;
  if (typeof predictTime === 'number') {
    console.log(
      `cost: billed on GPU/CPU seconds — metrics.predict_time=${predictTime}s for this run; ` +
        'see provider dashboard (Replicate billing) for the dollar amount at the model\u2019s hardware rate'
    );
  } else {
    console.log('cost: see provider dashboard (Replicate billing; no predict_time metric returned)');
  }
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
