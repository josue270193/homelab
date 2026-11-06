"use client";

import type { MouseEvent } from "react";
import { localeNames, locales, type Locale } from "@/content/i18n";
import { LOCALE_COOKIE } from "@/content/locale-detection";

// EN / ES / DE in the header (#92). Plain links, so it works without JavaScript; with JavaScript a
// click also remembers the choice in the `lang` cookie (read by src/proxy.ts on the next visit
// to `/`) and keeps the current #section.

const ONE_YEAR = 60 * 60 * 24 * 365;

function remember(event: MouseEvent<HTMLAnchorElement>, locale: Locale) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`;
  event.currentTarget.href = `/${locale}${location.hash}`;
}

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex h-10 items-center rounded-control border border-border bg-surface p-1 font-mono text-xs">
        {locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale} className="h-full">
              <a
                href={`/${locale}`}
                hrefLang={locale}
                lang={locale}
                aria-label={localeNames[locale]}
                aria-current={active ? "true" : undefined}
                title={localeNames[locale]}
                onClick={(event) => remember(event, locale)}
                className={`flex h-full items-center rounded-[calc(var(--radius-control)-0.25rem)] px-2.5 uppercase transition-[color,background-color,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:active:scale-[0.97] ${
                  active ? "bg-primary text-primary-fg" : "text-muted hover:text-primary"
                }`}
              >
                {locale}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
