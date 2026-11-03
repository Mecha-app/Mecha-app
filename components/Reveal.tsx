"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll reveal (design-elevation pass 1) — content settles up once as it
 * enters the viewport; the mechanics live in globals.css (.reveal), gated
 * on the pre-paint .js class so content is never hidden without JS.
 * Motion conveys state (§1.6): one calm entrance, never a loop.
 * prefers-reduced-motion is honored in the CSS layer.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className ?? ""}`}
      data-revealed={shown || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
