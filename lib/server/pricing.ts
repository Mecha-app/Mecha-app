/**
 * pricing.ts — the ONE place MECHA's money numbers live (Stripe pass,
 * 2026-11-18). The settled model (Frantz, 2026-11-17/18):
 *
 *   Free        5 diagnoses, lifetime (drivers)
 *   Pro         $9.99/month = 100 diagnosis credits per month
 *               (monthly bucket, resets each cycle, NO rollover)
 *   Single      one diagnosis credit, bought on its own — never expires
 *   Shops       a free TRIAL at signup (below), then $149/month =
 *               500 diagnosis credits per month
 *
 * THE SHOPS TRIAL (owner decision, 2026-11-19 — final spec): a shop
 * gets 14 days free AND 25 free diagnosis credits, no card to start.
 * The trial ends at whichever comes first — 14 days elapsed or the
 * 25 trial credits used — then the $149/month plan is the way back
 * in. The trial credits are the shop free allowance
 * (shops.free_diagnoses_used); the window lives on the shop record
 * (migration 0020). This supersedes the original "10 free at
 * signup, no expiry" shop allowance.
 *
 * 1 diagnosis = 1 credit, everywhere. Nothing is "unlimited".
 *
 * The single-diagnosis price is THE configurable value: change
 * DIAGNOSIS_PRICE_CENTS_DEFAULT here, or set MECHA_DIAGNOSIS_PRICE_CENTS
 * in the environment, and the checkout, the paywall and the billing
 * section follow (they format this value at runtime). The static
 * pricing-page copy in lib/i18n/dictionaries carries the same numbers
 * as literals — if the default ever changes, update those strings in
 * the same commit.
 */

function envCents(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** One purchased diagnosis credit, in cents. Default $4.00. */
export const DIAGNOSIS_PRICE_CENTS_DEFAULT = 400;
export function diagnosisPriceCents(): number {
  return envCents("MECHA_DIAGNOSIS_PRICE_CENTS", DIAGNOSIS_PRICE_CENTS_DEFAULT);
}

/** Pro subscription: $9.99/month for PRO_MONTHLY_CREDITS diagnoses. */
export const PRO_PLAN_PRICE_CENTS = 999;
export const PRO_MONTHLY_CREDITS = 100;

/** Shops (business) subscription: $149/month for SHOP_MONTHLY_CREDITS. */
export const SHOP_PLAN_PRICE_CENTS = 14900;
export const SHOP_MONTHLY_CREDITS = 500;

/** Free diagnoses at signup for drivers: 5 (quota.ts
 * FREE_DIAGNOSIS_LIMIT). Shops get the free trial below. */
export const SHOP_FREE_DIAGNOSES = 25;

/** The Shops free trial (2026-11-19): 14 days AND 25 diagnosis
 * credits, no card to start; the trial ends at whichever limit is
 * hit first. SHOP_TRIAL_CREDITS is the trial-credit pool — the same
 * counter as the shop free allowance above. */
export const SHOP_TRIAL_DAYS = 14;
export const SHOP_TRIAL_CREDITS = SHOP_FREE_DIAGNOSES;

/** The shops free tier from 2026-11-20 (owner decision): 20 free
 * diagnoses per business, NO day limit — the count is the limit,
 * then the $149/mo subscription is required to keep diagnosing.
 * Applies to businesses stamped 'free20' by migration 0023 (every
 * row created after it). Businesses that registered under the
 * 14-day / 25-diagnosis promise keep those LEGACY terms — see
 * shopFreeTermsOf in credits.ts. Not advertised on the homepage or
 * as a public headline; the shop sees its own count in its
 * dashboard. */
export const SHOP_FREE20_LIMIT = 20;

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** The price strings the copy renders ("$4", "$9.99", "$149"). */
export function formatUsdShort(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);
}
