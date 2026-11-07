// Sends one message through the portfolio's own Telegram bot (#76), not Uptime Kuma's.
// Returns false on any failure; the caller shows a generic error and never the details.

export async function sendTelegram(
  { token, chatId, text }: { token: string; chatId: string; text: string },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return true;
    // Telegram's own description only; the URL (which contains the token) is never logged.
    const detail = await res.json().catch(() => ({}));
    console.error(`telegram: sendMessage failed (${res.status}) ${detail?.description ?? ""}`);
    return false;
  } catch (error) {
    console.error(`telegram: sendMessage error (${(error as Error).name})`);
    return false;
  }
}
