import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/demo", "/buy", "/tools/fees", "/tools/tron-address"].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    priority: p === "" ? 1 : 0.8,
  }));
}
