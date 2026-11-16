/**
 * Security headers (security pass, 2026-11-03) — applied to every route.
 *
 * The CSP is deliberately same-origin: the app loads NO external
 * scripts, styles, fonts, or images (next/font self-hosts the type;
 * the films and posters are local files). 'unsafe-inline' remains on
 * script/style because the App Router streams inline bootstrap
 * scripts and the theme bootstrap is an inline <script> — nonce-based
 * strict CSP is the later hardening step. frame-src names Stripe's
 * hosted surfaces only, ahead of the WP6 pricing/checkout build; the
 * checkout flow itself is a top-level redirect, never an embed of
 * MECHA pages (frame-ancestors 'none' + X-Frame-Options DENY).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework in a response header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // WP2 is a static foundation build: marketing routes prerender,
  // /api/* stubs are route handlers in the same project (Migration V2 §5, Option A).
};

export default nextConfig;
