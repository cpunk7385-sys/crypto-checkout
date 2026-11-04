import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/demo", "/buy", "/tools/fees", "/tools/tron-address"].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    priority: p === "" ? 1 : 0.8,
  }));
}
