"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { advanceIndex, retreatIndex, swipeDirection } from "../carousel";

/**
 * useCarousel — auto-advancing, swipeable slide state for the
 * homepage carousels. Advances on an interval (cleaned up on
 * unmount and whenever the slide count changes), pauses while
 * the pointer is over the carousel, and reads touch swipes via
 * the pure helpers in lib/carousel. With 0–1 slides it never
 * advances.
 */
export function useCarousel(count: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => advanceIndex(i, count));
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs, paused]);

  const next = useCallback(() => setIndex((i) => advanceIndex(i, count)), [count]);
  const prev = useCallback(() => setIndex((i) => retreatIndex(i, count)), [count]);
  const goTo = useCallback(
    (i: number) => setIndex(count > 0 ? ((i % count) + count) % count : 0),
    [count],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dir = swipeDirection(touchX.current, e.changedTouches[0].clientX);
    if (dir === "next") next();
    else if (dir === "prev") prev();
    touchX.current = null;
  };
  const onMouseEnter = () => setPaused(true);
  const onMouseLeave = () => setPaused(false);

  return { index, next, prev, goTo, onTouchStart, onTouchEnd, onMouseEnter, onMouseLeave };
}
