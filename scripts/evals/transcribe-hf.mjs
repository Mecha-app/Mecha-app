#!/usr/bin/env node
/**
 * MECHA eval sandbox — Hugging Face transcription trial.
 *
 * SANDBOX ONLY: evaluation tool. Never customer-facing, never imported by the app.
 *
 * Usage:
 *   HF_API_KEY=... node scripts/evals/transcribe-hf.mjs <audio-file>
 *
 * Sends the audio file to the Hugging Face Inference Providers router for
 * `openai/whisper-large-v3` and prints the transcript, wall-clock latency,
 * and a rough cost note.
 *
 * Endpoint (verified 2026-11-14 via HF docs / router references):
 *   POST https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3
 * The most reliable ASR call shape on this endpoint is RAW AUDIO BYTES as the
 * request body (no JSON wrapper, no `parameters`); the response is JSON like
 * `{ "text": "...", "chunks": [...] }`.
 *
 * Env:
 *   HF_API_KEY       (required) Hugging Face token with Inference Providers permission.
 *   HF_WHISPER_MODEL (optional) Override the model id. Default: openai/whisper-large-v3
 *
 * No dependencies. Node 18+ (global fetch).
 */

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const MODEL = process.env.HF_WHISPER_MODEL || 'openai/whisper-large-v3';
const ENDPOINT = `https://router.huggingface.co/hf-inference/models/${MODEL}`;

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

async function main() {
  // Env gate FIRST: no key -> clear message, exit 0, no network call.
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    console.log(
      'not configured: HF_API_KEY is not set. ' +
        'Set HF_API_KEY to a Hugging Face token (with Inference Providers permission) and re-run. ' +
        'No network call was made.'
    );
    process.exit(0);
  }

  const audioFile = process.argv[2];
  if (!audioFile) {
    console.error('usage: node scripts/evals/transcribe-hf.mjs <audio-file>');
    process.exit(1);
  }

  let audioBytes;
  try {
    audioBytes = await readFile(audioFile);
  } catch (err) {
    console.error(`error: could not read audio file "${audioFile}": ${err.message}`);
    process.exit(1);
  }

  const contentType = MIME_BY_EXT[extname(audioFile).toLowerCase()] || 'application/octet-stream';

  console.log(`model: ${MODEL}`);
  console.log(`endpoint: ${ENDPOINT}`);
  console.log(`input: ${audioFile} (${audioBytes.length} bytes, ${contentType})`);

  const started = Date.now();
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': contentType,
      },
      body: audioBytes,
    });
  } catch (err) {
    console.error(`error: request failed: ${err.message}`);
    process.exit(1);
  }
  const latencyMs = Date.now() - started;

  const rawText = await response.text();
  if (!response.ok) {
    console.error(`error: HTTP ${response.status} from Hugging Face`);
    console.error(`latency_ms: ${latencyMs}`);
    console.error(`response: ${rawText}`);
    // A 503 with estimated_time means the model is cold-loading; that is a
    // latency data point worth recording, not a code bug.
    process.exit(1);
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    result = rawText;
  }

  console.log(`latency_ms: ${latencyMs}`);
  console.log('result (raw JSON):');
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
  if (result && typeof result === 'object' && typeof result.text === 'string') {
    console.log('transcript:');
    console.log(result.text);
  }

  // Cost note: the HF Inference response does not return per-request usage for
  // ASR. Billing is provider/credit based — see the HF dashboard.
  console.log(
    `cost: see provider dashboard (Hugging Face Inference Providers; ` +
      `basis: ${audioBytes.length} audio bytes sent, no usage field returned by this endpoint)`
  );
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
