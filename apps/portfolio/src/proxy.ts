import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, pickLocale } from "@/content/locale-detection";

// `/` -> /en | /es | /de per visitor (#91): cookie > Cloudflare country > Accept-Language > en.
// The localized pages stay static; only this redirect is decided per request.
export function proxy(request: NextRequest) {
  const locale = pickLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    country: request.headers.get("cf-ipcountry"),
    acceptLanguage: request.headers.get("accept-language"),
  });
  // Next needs an absolute Location. Behind Cloudflare -> Traefik the server itself sees http://,
  // so the scheme comes from X-Forwarded-Proto (set by Cloudflare, passed through by Traefik).
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "https" || proto === "http") url.protocol = `${proto}:`;

  const response = NextResponse.redirect(url, 307);
  // Depends on the visitor (country comes from the IP), so never cache it anywhere.
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

export const config = { matcher: "/" };
