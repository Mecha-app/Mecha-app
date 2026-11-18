/**
 * pricing.ts — the ONE place MECHA's money numbers live (Stripe pass,
 * 2026-11-18). The settled model (Frantz, 2026-11-17/18):
 *
 *   Free        5 diagnoses, lifetime (drivers) / 10 (shops)
 *   Pro         $9.99/month = 100 diagnosis credits per month
 *               (monthly bucket, resets each cycle, NO rollover)
 *   Single      one diagnosis credit, bought on its own — never expires
 *   Shops       $149/month = 500 diagnosis credits per month + the
 *               10 free diagnoses at signup
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

/** Free diagnoses at signup: drivers 5 (quota.ts FREE_DIAGNOSIS_LIMIT),
 * shops 10. */
export const SHOP_FREE_DIAGNOSES = 10;

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** The price strings the copy renders ("$4", "$9.99", "$149"). */
export function formatUsdShort(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);
}
