// Run with `npm test`. Uses the real content, so a broken dictionary or profile shows up here.
import assert from "node:assert/strict";
import { test } from "node:test";
import { aiCrawlers, buildJsonLd, buildLlmsTxt, jsonForScript, type SiteData } from "./ai.ts";
import { de } from "./dictionaries/de.ts";
import { en } from "./dictionaries/en.ts";
import { profile, projects, siteUrl, socials } from "./profile.ts";

const site: SiteData = { siteUrl, name: profile.name, photoSrc: profile.photo?.src ?? null, socials, projects };
const languages = [
  { locale: "en", label: "English" },
  { locale: "es", label: "Español" },
  { locale: "de", label: "Deutsch" },
];

test("llms.txt follows the llmstxt.org shape", () => {
  const txt = buildLlmsTxt(site, en, languages);
  const lines = txt.split("\n");
  assert.equal(lines[0], `# ${profile.name}`);
  assert.ok(lines[2].startsWith("> "), "summary blockquote after the title");
  for (const h of ["## Pages", "## Projects", "## Contact", "## Optional"]) assert.ok(lines.includes(h), h);
});

test("llms.txt links every locale, project, demo and social", () => {
  const txt = buildLlmsTxt(site, en, languages);
  for (const { locale } of languages) assert.ok(txt.includes(`(${siteUrl}/${locale})`), locale);
  for (const p of projects) {
    assert.ok(txt.includes(`(${p.repo})`), p.repo);
    for (const d of p.demos ?? []) assert.ok(txt.includes(`(${d.href})`), d.href);
  }
  for (const s of socials) assert.ok(txt.includes(`(${s.href})`), s.href);
  assert.ok(!txt.includes("undefined"));
});

test("JSON-LD describes the person and site per locale", () => {
  const ld = buildJsonLd(site, de, "de");
  assert.equal(ld["@context"], "https://schema.org");
  const [person, website] = ld["@graph"] as Record<string, unknown>[];
  assert.equal(person["@type"], "Person");
  assert.equal(person.name, profile.name);
  assert.equal(person.url, `${siteUrl}/de`);
  assert.ok(String(person.description).startsWith(de.headline));
  assert.deepEqual(person.sameAs, socials.map((s) => s.href));
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.inLanguage, "de");
});

test("script JSON can't close its <script> tag", () => {
  const out = jsonForScript({ x: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("<"));
  assert.deepEqual(JSON.parse(out), { x: "</script><script>alert(1)</script>" });
});

test("the main AI crawlers are listed", () => {
  for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"]) {
    assert.ok(aiCrawlers.includes(bot), bot);
  }
});
