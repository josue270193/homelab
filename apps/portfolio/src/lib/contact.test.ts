import assert from "node:assert/strict";
import { test } from "node:test";
import { formatContactMessage, limits, validateContact } from "./contact.ts";
import { sendTelegram } from "./telegram.ts";

const good = { name: "Ada", email: "ada@example.com", message: "Hello there, nice homelab!" };

test("a valid message passes, trimmed", () => {
  const r = validateContact({ ...good, name: "  Ada  " });
  assert.deepEqual(r, { ok: true, value: good });
});

test("each field is checked server-side", () => {
  assert.deepEqual(validateContact({ ...good, name: "" }), { ok: false, fields: ["name"] });
  assert.deepEqual(validateContact({ ...good, name: "x".repeat(limits.name + 1) }), { ok: false, fields: ["name"] });
  assert.deepEqual(validateContact({ ...good, email: "not-an-email" }), { ok: false, fields: ["email"] });
  assert.deepEqual(validateContact({ ...good, message: "short" }), { ok: false, fields: ["message"] });
  assert.deepEqual(
    validateContact({ ...good, message: "x".repeat(limits.messageMax + 1) }),
    { ok: false, fields: ["message"] },
  );
});

test("garbage input is rejected, not thrown", () => {
  assert.deepEqual(validateContact(null), { ok: false, fields: ["name", "email", "message"] });
  assert.deepEqual(validateContact({ name: 1, email: [], message: {} }), { ok: false, fields: ["name", "email", "message"] });
});

test("control characters are stripped, newlines kept", () => {
  const r = validateContact({ ...good, message: "line one\u0000\nline two\u0007" });
  assert.equal(r.ok && r.value.message, "line one\nline two");
});

test("the Telegram text is plain and includes the sender", () => {
  const text = formatContactMessage(good, "es");
  assert.match(text, /Portfolio contact \(es\)/);
  assert.match(text, /From: Ada <ada@example\.com>/);
  assert.ok(text.endsWith(good.message));
});

test("sendTelegram posts to the bot API and reports success", async () => {
  let called: { url: string; body: Record<string, unknown> } | undefined;
  const fake = (async (url: string, init: RequestInit) => {
    called = { url, body: JSON.parse(init.body as string) };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await sendTelegram({ token: "123:abc", chatId: "42", text: "hi" }, fake), true);
  assert.equal(called?.url, "https://api.telegram.org/bot123:abc/sendMessage");
  assert.equal(called?.body.chat_id, "42");
  assert.equal(called?.body.parse_mode, undefined);
});

test("sendTelegram returns false on API errors and network failures, never throws", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const rejected = (async () =>
      new Response(JSON.stringify({ ok: false, description: "Unauthorized" }), { status: 401 })) as unknown as typeof fetch;
    const broken = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    assert.equal(await sendTelegram({ token: "t", chatId: "1", text: "x" }, rejected), false);
    assert.equal(await sendTelegram({ token: "t", chatId: "1", text: "x" }, broken), false);
  } finally {
    console.error = original;
  }
});
