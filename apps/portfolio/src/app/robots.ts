import type { MetadataRoute } from "next";
import { aiCrawlers } from "@/content/ai";
import { siteUrl } from "@/content/profile";

// Everyone may crawl the pages, not the API. AI crawlers are named explicitly (#118) so the
// intent is visible and a later `*` rule can't block them by accident.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: aiCrawlers, allow: "/", disallow: "/api/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
