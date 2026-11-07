import assert from "node:assert/strict";
import { test } from "node:test";
import { HONEYPOT_FIELD, isHoneypotFilled } from "./contact.ts";
import { createRateLimiter } from "./rate-limit.ts";
import { verifyTurnstile } from "./turnstile.ts";

test("rate limit: 5 per hour per IP, then blocked until the window resets", () => {
  const limit = createRateLimiter({ max: 5, windowMs: 3_600_000 });
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(limit("1.2.3.4", t0 + i).allowed, true);
  const blocked = limit("1.2.3.4", t0 + 10);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 3600);
  assert.equal(limit("5.6.7.8", t0 + 10).allowed, true, "other IPs are not affected");
  assert.equal(limit("1.2.3.4", t0 + 3_600_000).allowed, true, "new window after an hour");
});

test("honeypot: empty passes, anything filled is a bot", () => {
  assert.equal(isHoneypotFilled({ [HONEYPOT_FIELD]: "" }), false);
  assert.equal(isHoneypotFilled({ [HONEYPOT_FIELD]: "   " }), false);
  assert.equal(isHoneypotFilled({}), false);
  assert.equal(isHoneypotFilled(null), false);
  assert.equal(isHoneypotFilled({ [HONEYPOT_FIELD]: "https://spam.example" }), true);
});

const reply = (body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

test("turnstile: only success:true from siteverify passes", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await verifyTurnstile({ secret: "s", token: "tok" }, reply({ success: true })), true);
    assert.equal(
      await verifyTurnstile({ secret: "s", token: "tok" }, reply({ success: false, "error-codes": ["invalid-input-response"] })),
      false,
    );
    const broken = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    assert.equal(await verifyTurnstile({ secret: "s", token: "tok" }, broken), false, "network error fails closed");
  } finally {
    console.error = original;
  }
});

test("turnstile: missing or oversized tokens are rejected without calling Cloudflare", async () => {
  let calls = 0;
  const counting = (async () => {
    calls++;
    return new Response("{}");
  }) as unknown as typeof fetch;
  assert.equal(await verifyTurnstile({ secret: "s", token: undefined }, counting), false);
  assert.equal(await verifyTurnstile({ secret: "s", token: "" }, counting), false);
  assert.equal(await verifyTurnstile({ secret: "s", token: "x".repeat(2049) }, counting), false);
  assert.equal(calls, 0);
});

test("turnstile: sends secret, token and IP", async () => {
  let sent: Record<string, unknown> = {};
  const capture = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ success: true }));
  }) as unknown as typeof fetch;
  await verifyTurnstile({ secret: "sec", token: "tok", ip: "1.2.3.4" }, capture);
  assert.deepEqual(sent, { secret: "sec", response: "tok", remoteip: "1.2.3.4" });
});
