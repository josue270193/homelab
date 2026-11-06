// Which locale `/` sends a visitor to (#91). Pure function, so it is unit-tested without a server
// (locale-detection.test.ts) and imported by src/proxy.ts.

// Explicit .ts extension: Node's test runner loads this file directly, without a bundler.
import { defaultLocale, hasLocale, type Locale } from "./i18n.ts";

// Cookie set by the language switcher (#92); an explicit choice always wins.
export const LOCALE_COOKIE = "lang";

// Visitor country (Cloudflare's CF-IPCountry, ISO 3166-1 alpha-2) -> language. Not listed -> English.
export const countryLocale: Record<string, Locale> = {
  // Spanish-speaking countries
  AR: "es", BO: "es", CL: "es", CO: "es", CR: "es", CU: "es", DO: "es", EC: "es", ES: "es", GQ: "es",
  GT: "es", HN: "es", MX: "es", NI: "es", PA: "es", PE: "es", PR: "es", PY: "es", SV: "es", UY: "es",
  VE: "es",
  // German-speaking countries
  AT: "de", CH: "de", DE: "de", LI: "de",
};

// Cloudflare codes that are not a country: XX = unknown, T1 = Tor. Treated as "no country".
const notACountry = new Set(["XX", "T1"]);

const isLocale = (value: string | undefined | null): value is Locale => !!value && hasLocale(value);

// Best supported language in an Accept-Language header, honoring q-values ("de-AT,de;q=0.9,en;q=0.8").
export function fromAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((entry) => entry.lang && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked.map((entry) => entry.lang).find(isLocale);
}

// Precedence: cookie > country > Accept-Language > English.
export function pickLocale(input: {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  const country = input.country?.trim().toUpperCase();
  if (country && !notACountry.has(country)) return countryLocale[country] ?? defaultLocale;
  return fromAcceptLanguage(input.acceptLanguage) ?? defaultLocale;
}
