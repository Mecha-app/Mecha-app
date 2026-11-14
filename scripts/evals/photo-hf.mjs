#!/usr/bin/env node
/**
 * MECHA eval sandbox — Hugging Face vision / warning-light trial.
 *
 * SANDBOX ONLY: evaluation tool. Never customer-facing, never imported by the app.
 *
 * Usage:
 *   HF_API_KEY=... node scripts/evals/photo-hf.mjs <image-file> [question]
 *
 * Sends the image to a vision-language model on Hugging Face Inference via
 * the router's OpenAI-compatible chat-completions route, using MECHA's real
 * production question by default (dashboard warning lights), and prints the
 * answer, wall-clock latency, and a rough cost note.
 *
 * Endpoint (verified 2026-11-14: HF router is OpenAI-compatible):
 *   POST https://router.huggingface.co/v1/chat/completions
 *   Body: { model, messages: [{ role: 'user', content: [
 *             { type: 'text', text: <question> },
 *             { type: 'image_url', image_url: { url: 'data:<mime>;base64,...' } }
 *           ] }] }
 *   Auth: Authorization: Bearer $HF_API_KEY (token needs Inference Providers permission)
 *
 * Model: default `Qwen/Qwen2.5-VL-7B-Instruct`. The model id itself is
 * verified (canonical Qwen2.5-VL checkpoint, Apache-2.0), but its live
 * serving through the HF Inference Providers router could NOT be conclusively
 * verified at writing time — availability depends on which providers serve it
 * that day. If the router returns a "not deployed / no provider" style error,
 * set HF_VISION_MODEL to another vision-language model the router currently
 * serves (check the model's Hugging Face page for "Inference Providers").
 *
 * Env:
 *   HF_API_KEY      (required) Hugging Face token with Inference Providers permission.
 *   HF_VISION_MODEL (optional) Override the model id. Default: Qwen/Qwen2.5-VL-7B-Instruct
 *
 * No dependencies. Node 18+ (global fetch).
 */

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const MODEL = process.env.HF_VISION_MODEL || 'Qwen/Qwen2.5-VL-7B-Instruct';
const ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

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

  const imageFile = process.argv[2];
  const question = process.argv.slice(3).join(' ') || DEFAULT_QUESTION;
  if (!imageFile) {
    console.error('usage: node scripts/evals/photo-hf.mjs <image-file> [question]');
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

  console.log(`model: ${MODEL}`);
  console.log(`endpoint: ${ENDPOINT}`);
  console.log(`input: ${imageFile} (${imageBytes.length} bytes, sent as base64 data URI)`);
  console.log(`question: ${question}`);

  const started = Date.now();
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: question },
              { type: 'image_url', image_url: { url: imageDataUri } },
            ],
          },
        ],
        max_tokens: 512,
      }),
    });
  } catch (err) {
    console.error(`error: request failed: ${err.message}`);
    process.exit(1);
  }
  const latencyMs = Date.now() - started;

  const rawText = await response.text();
  if (!response.ok) {
    console.error(`error: HTTP ${response.status} from Hugging Face router`);
    console.error(`latency_ms: ${latencyMs}`);
    console.error(`response: ${rawText}`);
    process.exit(1);
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    result = null;
  }

  console.log(`latency_ms: ${latencyMs}`);
  console.log('result (raw JSON):');
  console.log(result ? JSON.stringify(result, null, 2) : rawText);

  const answer =
    result?.choices?.[0]?.message?.content ??
    result?.choices?.[0]?.text ??
    null;
  if (answer) {
    console.log('answer:');
    console.log(answer);
  }

  // Cost note: chat-completions responses normally carry a `usage` object —
  // that token count is the billing basis on HF Inference Providers.
  if (result?.usage) {
    const u = result.usage;
    console.log(
      `cost: usage returned — prompt_tokens=${u.prompt_tokens ?? '?'}, ` +
        `completion_tokens=${u.completion_tokens ?? '?'}, total_tokens=${u.total_tokens ?? '?'}; ` +
        'dollar amount depends on the serving provider\u2019s per-token rate — see provider dashboard'
    );
  } else {
    console.log('cost: see provider dashboard (Hugging Face Inference Providers; no usage field returned)');
  }
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
