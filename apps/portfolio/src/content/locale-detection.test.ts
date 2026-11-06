// Run with `npm test` (Node's built-in test runner; Node strips the TypeScript types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { fromAcceptLanguage, pickLocale } from "./locale-detection.ts";

test("country decides when there is no cookie", () => {
  assert.equal(pickLocale({ country: "AR" }), "es");
  assert.equal(pickLocale({ country: "MX" }), "es");
  assert.equal(pickLocale({ country: "ES" }), "es");
  assert.equal(pickLocale({ country: "DE" }), "de");
  assert.equal(pickLocale({ country: "AT" }), "de");
  assert.equal(pickLocale({ country: "CH" }), "de");
  assert.equal(pickLocale({ country: "US" }), "en");
  assert.equal(pickLocale({ country: "BR" }), "en");
  assert.equal(pickLocale({ country: "ar" }), "es"); // case-insensitive
});

test("country beats Accept-Language", () => {
  assert.equal(pickLocale({ country: "AR", acceptLanguage: "de-DE,de;q=0.9" }), "es");
  assert.equal(pickLocale({ country: "US", acceptLanguage: "es-AR,es;q=0.9" }), "en");
});

test("the cookie beats everything", () => {
  assert.equal(pickLocale({ cookie: "de", country: "AR", acceptLanguage: "es" }), "de");
  assert.equal(pickLocale({ cookie: "en", country: "DE" }), "en");
});

test("an invalid cookie is ignored", () => {
  assert.equal(pickLocale({ cookie: "fr", country: "DE" }), "de");
  assert.equal(pickLocale({ cookie: "", country: "AR" }), "es");
});

test("no country (local dev, tailnet) or a non-country code falls back to Accept-Language", () => {
  assert.equal(pickLocale({ acceptLanguage: "de-AT,de;q=0.9,en;q=0.8" }), "de");
  assert.equal(pickLocale({ country: "XX", acceptLanguage: "es-419,es;q=0.9" }), "es");
  assert.equal(pickLocale({ country: "T1", acceptLanguage: "de" }), "de");
});

test("nothing usable -> English", () => {
  assert.equal(pickLocale({}), "en");
  assert.equal(pickLocale({ acceptLanguage: "fr-FR,fr;q=0.9" }), "en");
  assert.equal(pickLocale({ country: "XX" }), "en");
});

test("Accept-Language honors q-values and skips unsupported languages", () => {
  assert.equal(fromAcceptLanguage("fr;q=1, es;q=0.5, de;q=0.8"), "de");
  assert.equal(fromAcceptLanguage("fr-CH, fr;q=0.9, en;q=0.8"), "en");
  assert.equal(fromAcceptLanguage("es;q=0, de;q=0.1"), "de"); // q=0 means "not acceptable"
  assert.equal(fromAcceptLanguage("*"), undefined);
  assert.equal(fromAcceptLanguage(""), undefined);
});
