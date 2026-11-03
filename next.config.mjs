/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // WP2 is a static foundation build: marketing routes prerender,
  // /api/* stubs are route handlers in the same project (Migration V2 §5, Option A).
};

export default nextConfig;
