/**
 * Pass #19 follow-up (2026-11-17, owner) — the homepage
 * carousels: a visual band of product-in-use loops, and a
 * reviews carousel in the competitor style.
 *
 * Pinned rules:
 *   - reviews are DATA-DRIVEN from lib/reviews only, and the
 *     section renders only when entries exist (zero entries =
 *     no section at all);
 *   - today's entries are SAMPLES: 4–6 of them, first name +
 *     last initial, a car, a 5-star row, one short quote — and
 *     REVIEWS_ARE_SAMPLES stays true until real permissioned
 *     reviews replace the samples wholesale (the rule is
 *     written in the data file itself);
 *   - while samples ship, the section shows a visible
 *     "Sample reviews" badge from the catalog — never buried;
 *   - NO aggregate claims anywhere in the section: no counts,
 *     no averages, no "verified" badges;
 *   - the carousel mechanics are the pure helpers in
 *     lib/carousel (wrap-around advance/retreat, swipe
 *     direction with a tap threshold), driven by the shared
 *     useCarousel hook (interval + cleanup + touch handlers);
 *   - the visual band reuses the site's own loop clips —
 *     no new media, no text on the clips.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REVIEWS, REVIEWS_ARE_SAMPLES, reviewsVisible } from "../lib/reviews";
import { advanceIndex, retreatIndex, swipeDirection } from "../lib/carousel";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("reviews data: 4–6 sample entries in the competitor shape, honestly flagged", () => {
  assert.ok(REVIEWS.length >= 4 && REVIEWS.length <= 6, `4–6 entries (saw ${REVIEWS.length})`);
  assert.equal(REVIEWS_ARE_SAMPLES, true, "today's entries are samples — the flag says so");
  for (const review of REVIEWS) {
    assert.match(review.name, /^[A-Z][a-z]+ [A-Z]\.$/, `first name + last initial: ${review.name}`);
    assert.ok(review.car.length >= 8, `a real car is named: ${review.car}`);
    assert.equal(review.stars, 5, "samples carry the 5-star row");
    assert.ok(review.quote.length >= 40 && review.quote.length <= 200, "one short quote");
  }
  // The wholesale-replacement rule is documented in the data
  // file itself, where the next editor will see it.
  const data = read("lib/reviews.ts");
  assert.ok(data.includes("permissioned"), "the data file states the permission rule");
  assert.ok(data.includes("DELETE EVERY"), "the data file states samples come out wholesale");
  assert.ok(data.includes("Pass #20"), "the data file names the feeder flow");
});

test("reviews visibility: renders with entries, renders nothing with zero entries", () => {
  assert.equal(reviewsVisible(REVIEWS), true, "entries exist → the section renders");
  assert.equal(reviewsVisible([]), false, "zero entries → no section at all");
  const comp = read("components/HomeReviews.tsx");
  assert.ok(comp.includes("reviewsVisible(REVIEWS)"), "the component gates on the data");
  assert.ok(comp.includes("return null"), "the empty state is a true no-render");
});

test("reviews honesty: visible sample badge, no aggregates, no verified badges", () => {
  const comp = read("components/HomeReviews.tsx");
  assert.ok(comp.includes("REVIEWS_ARE_SAMPLES"), "the badge is tied to the samples flag");
  assert.ok(comp.includes("r.sampleBadge"), "the badge copy comes from the catalog");
  // The ban is on shipped code and entry values — the files'
  // own documentation comments state the rule using the words,
  // so strip comments before asserting.
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const src of [strip(comp), strip(read("lib/reviews.ts"))]) {
    assert.ok(!/verified/i.test(src), "no verified-owner badges");
    assert.ok(!/average/i.test(src), "no average-rating claims");
    assert.ok(!/\d{1,3},\d{3}\+/.test(src), "no review-count claims");
    assert.ok(!/10,000/.test(src), "no 10,000+ claims");
  }
  for (const review of REVIEWS) {
    assert.ok(!/verified/i.test(review.quote + review.name + review.car), "entry values carry no badges");
  }
  // The star row renders from the entry's own stars value.
  assert.ok(comp.includes("review.stars"), "stars render from the data");
  assert.ok(comp.includes("Array.from"), "the star row is built per entry");
});

test("carousel mechanics: wrap-around advance/retreat and swipe direction", () => {
  assert.equal(advanceIndex(0, 6), 1);
  assert.equal(advanceIndex(5, 6), 0, "advance wraps past the end");
  assert.equal(advanceIndex(0, 0), 0, "an empty carousel never moves");
  assert.equal(retreatIndex(0, 6), 5, "retreat wraps before the start");
  assert.equal(retreatIndex(3, 6), 2);
  assert.equal(swipeDirection(200, 100), "next", "a leftward swipe goes next");
  assert.equal(swipeDirection(100, 200), "prev", "a rightward swipe goes back");
  assert.equal(swipeDirection(100, 120), null, "a small movement is a tap, not a swipe");
  // Both carousels run on the shared hook: interval-driven
  // auto-advance with cleanup, plus touch handlers.
  const hook = read("lib/client/useCarousel.ts");
  assert.ok(hook.includes("setInterval"), "auto-advance is interval-driven");
  assert.ok(hook.includes("clearInterval"), "the interval is cleaned up");
  assert.ok(hook.includes("advanceIndex"), "the hook advances via the pure helper");
  for (const rel of ["components/HomeReviews.tsx", "components/HomeShowcase.tsx"]) {
    const src = read(rel);
    assert.ok(src.includes("useCarousel"), `${rel} uses the shared carousel hook`);
    assert.ok(src.includes("onTouchStart") && src.includes("onTouchEnd"), `${rel} is swipeable`);
    assert.ok(src.includes("translateX"), `${rel} slides by transform`);
  }
});

test("showcase: reuses the site's own loop clips, catalog copy only", () => {
  const comp = read("components/HomeShowcase.tsx");
  assert.ok(comp.includes("<LoopClip"), "slides are the existing loop clips");
  for (const name of ["diagnose", "quote", "mechanic", "roadside", "alert"]) {
    assert.ok(comp.includes(`"${name}"`), `clip reused: ${name}`);
  }
  assert.ok(comp.includes("t.showcase"), "the band's only copy comes from the catalog");
});
