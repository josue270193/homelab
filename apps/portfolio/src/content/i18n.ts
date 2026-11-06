// Supported locales (#90). Routes live under /[lang]; `/` redirects to the default one.

export const locales = ["en", "es", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

// Each language named in itself, for the language switcher (#92).
export const localeNames: Record<Locale, string> = { en: "English", es: "Español", de: "Deutsch" };
