import { formatContactMessage, validateContact } from "@/lib/contact";
import { sendTelegram } from "@/lib/telegram";
import { hasLocale } from "@/content/i18n";

// Contact form endpoint (#76). Configuration is read at request time, so the same image runs with
// the form on or off. Bot protection (Turnstile, honeypot, rate limit) comes in #77.

const MAX_BODY_BYTES = 10_000;

function config() {
  const token = process.env.CONTACT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.CONTACT_TELEGRAM_CHAT_ID;
  const enabled = process.env.CONTACT_ENABLED === "true" && !!token && !!chatId;
  return { enabled, token: token ?? "", chatId: chatId ?? "" };
}

// The page is static, so the form asks here whether to show itself.
export function GET() {
  return Response.json({ enabled: config().enabled }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { enabled, token, chatId } = config();
  if (!enabled) return Response.json({ error: "disabled" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid", fields: ["name", "email", "message"] }, { status: 400 });
  }

  const result = validateContact(body);
  if (!result.ok) return Response.json({ error: "invalid", fields: result.fields }, { status: 400 });

  const locale = typeof body.locale === "string" && hasLocale(body.locale) ? body.locale : "en";
  const sent = await sendTelegram({ token, chatId, text: formatContactMessage(result.value, locale) });
  // Details stay in the server log (without the token); the visitor only learns it failed.
  return sent ? Response.json({ ok: true }) : Response.json({ error: "unavailable" }, { status: 502 });
}
