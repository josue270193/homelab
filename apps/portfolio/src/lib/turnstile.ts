// Server-side check of a Cloudflare Turnstile token (#77). The widget alone proves nothing:
// only this call does. Fails closed: any error means "not verified".

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export async function verifyTurnstile(
  { secret, token, ip }: { secret: string; token: unknown; ip?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) return false;
  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(ip && { remoteip: ip }) }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.success === true) return true;
    console.error(`turnstile: rejected (${(data["error-codes"] ?? []).join(",")})`);
    return false;
  } catch (error) {
    console.error(`turnstile: siteverify error (${(error as Error).name})`);
    return false;
  }
}
