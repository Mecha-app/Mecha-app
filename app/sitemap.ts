import type { MetadataRoute } from "next";
import { FAULT_CODE_PAGES, POPULAR_MODELS } from "@/lib/server/faultCodes";

/**
 * Sitemap (Pass #20) — the public surface, including the SEO
 * engine's programmatic pages: one URL per curated fault code and
 * one per popular model's common-problems page, both generated from
 * the same dataset module the pages render from, so the sitemap can
 * never list a page that doesn't exist.
 */
const BASE = "https://mechatech.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/pricing",
    "/shops",
    "/diagnose",
    "/scan",
    "/marketplace",
    "/contact",
    "/privacy",
    "/terms",
    "/codes",
    "/check",
  ];
  const now = new Date();
  return [
    ...staticRoutes.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
    })),
    ...FAULT_CODE_PAGES.map((entry) => ({
      url: `${BASE}/codes/${entry.code}`,
      lastModified: now,
    })),
    ...POPULAR_MODELS.map((model) => ({
      url: `${BASE}/cars/${model.slug}/common-problems`,
      lastModified: now,
    })),
  ];
}
