import { buildLlmsTxt } from "@/content/ai";
import { getDictionary } from "@/content/dictionaries";
import { defaultLocale, localeNames, locales } from "@/content/i18n";
import { profile, projects, siteUrl, socials } from "@/content/profile";

// /llms.txt (#118): a Markdown summary for LLM tools, built from the same content as the page.
// No request data is read, so with cacheComponents it is prerendered at build time.
// Default language first in the page list.

export function GET() {
  const ordered = [defaultLocale, ...locales.filter((l) => l !== defaultLocale)];
  const body = buildLlmsTxt(
    { siteUrl, name: profile.name, photoSrc: profile.photo?.src ?? null, socials, projects },
    getDictionary(defaultLocale),
    ordered.map((locale) => ({ locale, label: localeNames[locale] })),
  );
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
