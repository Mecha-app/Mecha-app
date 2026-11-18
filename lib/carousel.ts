/**
 * Carousel math — pure helpers shared by the homepage carousels
 * (components/HomeReviews, components/HomeShowcase, driven by
 * lib/client/useCarousel). Kept dependency-free so the rotation
 * and swipe rules are unit-testable without a DOM.
 */

/** Next slide index, wrapping past the end back to 0. */
export function advanceIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return (index + 1) % count;
}

/** Previous slide index, wrapping before 0 back to the last. */
export function retreatIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return (index - 1 + count) % count;
}

/**
 * Reads a horizontal swipe: a leftward swipe (finger moves
 * left) goes to the NEXT slide, a rightward swipe goes back.
 * Movement under the threshold is a tap, not a swipe.
 */
export function swipeDirection(
  startX: number,
  endX: number,
  threshold = 40,
): "next" | "prev" | null {
  const dx = endX - startX;
  if (Math.abs(dx) < threshold) return null;
  return dx < 0 ? "next" : "prev";
}
