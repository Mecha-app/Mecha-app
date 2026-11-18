/**
 * Customer reviews — the SINGLE data source for the homepage
 * reviews carousel (components/HomeReviews).
 *
 * ⚠️ SAMPLES SHIP TODAY — READ BEFORE EDITING.
 * MECHA has no real, permissioned customer reviews yet
 * (2026-11-17). The entries below are SAMPLES, written to show
 * the section's shape, and the carousel labels them with a
 * visible "Sample reviews" badge for exactly as long as they
 * are here. Each sample quote is grounded in a feature MECHA
 * really has (dashboard photo scan, plain-English answers, the
 * fair-price check, saved Health Vault history, honest
 * uncertainty) — but the people, cars, and words are samples,
 * not customers.
 *
 * THE RULE: when the first REAL review arrives — a real
 * customer, their own words, their permission to publish (the
 * Pass #20 outcome-capture flow is the feeder) — DELETE EVERY
 * SAMPLE in the same edit and set REVIEWS_ARE_SAMPLES to
 * false. Real and sample entries never mix. Never add an
 * aggregate claim here (no counts, no average rating) and
 * never a "verified" badge: the section shows individual
 * reviews only.
 */
export interface Review {
  /** First name + last initial, e.g. "Marcus T." */
  name: string;
  /** The reviewer's car, e.g. "2018 Honda Accord". */
  car: string;
  /** Star row, 1–5. */
  stars: 1 | 2 | 3 | 4 | 5;
  /** One short quote, in the reviewer's voice. */
  quote: string;
}

/** True while REVIEWS holds samples; false once real reviews replace them. */
export const REVIEWS_ARE_SAMPLES = true;

export const REVIEWS: Review[] = [
  {
    name: "Marcus T.",
    car: "2018 Honda Accord",
    stars: 5,
    quote:
      "I photographed my dashboard and MECHA told me in plain English what each light meant — and that the oil pressure one meant stop driving now.",
  },
  {
    name: "Priya S.",
    car: "2020 Toyota RAV4",
    stars: 5,
    quote:
      "A shop quoted me $780 for an alternator. MECHA showed me the fair range first, so I knew exactly which lines to ask about.",
  },
  {
    name: "Denise W.",
    car: "2016 Ford F-150",
    stars: 5,
    quote:
      "It explained my fault code like a friend would: what it is, how serious it is, and what it should cost.",
  },
  {
    name: "Jorge M.",
    car: "2019 Subaru Outback",
    stars: 5,
    quote:
      "Every diagnosis is saved with the car. Two years of history, all in one place — no paper folder.",
  },
  {
    name: "Alisha K.",
    car: "2021 Hyundai Elantra",
    stars: 5,
    quote:
      "It didn't fake being sure. It showed me three possible causes and what would narrow it down. That honesty is the point.",
  },
  {
    name: "Tom B.",
    car: "2015 Jeep Grand Cherokee",
    stars: 5,
    quote:
      "First time I walked into a shop already knowing the numbers. The conversation went very differently.",
  },
];

/** The carousel renders only when at least one entry exists. */
export function reviewsVisible(reviews: readonly Review[]): boolean {
  return reviews.length > 0;
}
