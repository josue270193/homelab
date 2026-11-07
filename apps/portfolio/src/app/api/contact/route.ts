import { formatContactMessage, isHoneypotFilled, validateContact } from "@/lib/contact";
import { createRateLimiter } from "@/lib/rate-limit";
import { sendTelegram } from "@/lib/telegram";
import { verifyTurnstile } from "@/lib/turnstile";
import { hasLocale } from "@/content/i18n";

// Contact form endpoint (#76), with bot protection (#77): rate limit per IP, honeypot, and a
// server-side Turnstile check before anything is sent. Configuration is read at request time, so the
// same image runs with the form on or off; it only turns on when every secret is present.

const MAX_BODY_BYTES = 10_000;
const limit = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

function config() {
  const env = {
    token: process.env.CONTACT_TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.CONTACT_TELEGRAM_CHAT_ID ?? "",
    siteKey: process.env.CONTACT_TURNSTILE_SITE_KEY ?? "",
    secret: process.env.CONTACT_TURNSTILE_SECRET_KEY ?? "",
  };
  const enabled = process.env.CONTACT_ENABLED === "true" && Object.values(env).every(Boolean);
  return { enabled, ...env };
}

// Cloudflare sets CF-Connecting-IP to the real visitor and overwrites any value the client sends.
// The public entrypoint is only reachable through the tunnel, so it can't be spoofed there.
const clientIp = (request: Request) =>
  request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

// The page is static, so the form asks here whether to show itself and which (public) site key to use.
export function GET() {
  const { enabled, siteKey } = config();
  return Response.json(enabled ? { enabled, siteKey } : { enabled }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { enabled, token, chatId, secret } = config();
  if (!enabled) return Response.json({ error: "disabled" }, { status: 503 });

  // Every attempt counts, so nobody can hammer validation or Turnstile either.
  const ip = clientIp(request);
  const { allowed, retryAfterSeconds } = limit(ip);
  if (!allowed) {
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid", fields: ["name", "email", "message"] }, { status: 400 });
  }

  // Bots that fill the hidden field get the same answer as a real success, so they learn nothing.
  if (isHoneypotFilled(body)) return Response.json({ ok: true });

  const result = validateContact(body);
  if (!result.ok) return Response.json({ error: "invalid", fields: result.fields }, { status: 400 });

  if (!(await verifyTurnstile({ secret, token: body.turnstileToken, ip }))) {
    return Response.json({ error: "captcha" }, { status: 400 });
  }

  const locale = typeof body.locale === "string" && hasLocale(body.locale) ? body.locale : "en";
  const sent = await sendTelegram({ token, chatId, text: formatContactMessage(result.value, locale) });
  // Details stay in the server log (without the token); the visitor only learns it failed.
  return sent ? Response.json({ ok: true }) : Response.json({ error: "unavailable" }, { status: 502 });
}
