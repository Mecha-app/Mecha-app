#!/usr/bin/env node
/**
 * MECHA eval sandbox — Replicate transcription trial.
 *
 * SANDBOX ONLY: evaluation tool. Never customer-facing, never imported by the app.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=... REPLICATE_WHISPER_VERSION=... \
 *     node scripts/evals/transcribe-replicate.mjs <audio-file>
 *
 * Creates a Replicate prediction for a Whisper model (`openai/whisper`),
 * polls until it succeeds/fails (with a timeout), and prints the transcript,
 * wall-clock latency, and a rough cost note. The audio is passed as a
 * base64 data URI.
 *
 * API (verified 2026-11-14 from Replicate's HTTP reference):
 *   POST https://api.replicate.com/v1/predictions        { version, input }
 *   GET  https://api.replicate.com/v1/predictions/{id}   poll `status`:
 *        starting -> processing -> succeeded | failed | canceled
 *   Auth: Authorization: Bearer $REPLICATE_API_TOKEN
 *
 * Why the version comes from the environment: public sources show several
 * DIFFERENT version hashes for `openai/whisper`, so no hash is pinned here —
 * inventing or guessing one would send eval traffic to the wrong build.
 * Copy the current version id from the model's API tab on replicate.com
 * (https://replicate.com/openai/whisper/api) and set:
 *   REPLICATE_WHISPER_VERSION=<64-char version id>
 *     — or, for an official-model slug form if Replicate accepts it in your
 *       account: REPLICATE_WHISPER_VERSION=openai/whisper
 * The script sends whatever you set verbatim as the prediction `version`.
 *
 * Env:
 *   REPLICATE_API_TOKEN     (required) Replicate API token.
 *   REPLICATE_WHISPER_VERSION (required) Whisper model version id / slug. See above.
 *   REPLICATE_TIMEOUT_MS    (optional) Poll timeout. Default: 180000 (3 min).
 *   REPLICATE_POLL_MS       (optional) Poll interval. Default: 2000.
 *
 * No dependencies. Node 18+ (global fetch).
 */

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const CREATE_URL = 'https://api.replicate.com/v1/predictions';
const MODEL_LABEL = 'openai/whisper (version from REPLICATE_WHISPER_VERSION)';

const MIME_BY_EXT = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
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

  const version = process.env.REPLICATE_WHISPER_VERSION;
  if (!version) {
    console.log(
      'not configured: REPLICATE_WHISPER_VERSION is not set. ' +
        'No Whisper version is pinned in this script on purpose (published hashes conflict). ' +
        'Copy the current version id for openai/whisper from https://replicate.com/openai/whisper/api ' +
        'and set REPLICATE_WHISPER_VERSION=<version id>, then re-run. ' +
        'No network call was made.'
    );
    process.exit(0);
  }

  const audioFile = process.argv[2];
  if (!audioFile) {
    console.error('usage: node scripts/evals/transcribe-replicate.mjs <audio-file>');
    process.exit(1);
  }

  let audioBytes;
  try {
    audioBytes = await readFile(audioFile);
  } catch (err) {
    console.error(`error: could not read audio file "${audioFile}": ${err.message}`);
    process.exit(1);
  }

  const mime = MIME_BY_EXT[extname(audioFile).toLowerCase()] || 'application/octet-stream';
  const audioDataUri = `data:${mime};base64,${audioBytes.toString('base64')}`;

  const timeoutMs = Number(process.env.REPLICATE_TIMEOUT_MS || 180000);
  const pollMs = Number(process.env.REPLICATE_POLL_MS || 2000);

  console.log(`model: ${MODEL_LABEL}`);
  console.log(`version: ${version}`);
  console.log(`endpoint: ${CREATE_URL}`);
  console.log(`input: ${audioFile} (${audioBytes.length} bytes, sent as base64 data URI)`);

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
          audio: audioDataUri,
          // openai/whisper input schema (see the model's API tab):
          model: 'large-v3',
          transcription: 'plain text',
          translate: false,
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

  console.log('result (raw JSON):');
  console.log(JSON.stringify(prediction.output ?? prediction, null, 2));

  const output = prediction.output;
  const transcript =
    output && typeof output === 'object'
      ? output.transcription || output.text || null
      : typeof output === 'string'
        ? output
        : null;
  if (transcript) {
    console.log('transcript:');
    console.log(transcript);
  }

  // Cost note: Replicate bills public models by hardware seconds; the
  // prediction's `metrics.predict_time` (seconds) is the billing basis when
  // present. No dollar figure is computed here because the hardware rate
  // depends on the model deployment.
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
