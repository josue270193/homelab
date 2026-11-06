import type { MetadataRoute } from "next";
import { locales } from "@/content/i18n";
import { siteUrl } from "@/content/profile";

// One entry per locale, each listing all language versions (hreflang) (#90).
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}`]));
  return locales.map((l) => ({
    url: `${siteUrl}/${l}`,
    changeFrequency: "monthly",
    priority: 1,
    alternates: { languages },
  }));
}
