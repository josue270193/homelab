// AI/LLM discoverability (#118): crawler list for robots.txt, /llms.txt and JSON-LD.
// Pure functions over the content modules' data, so they are unit-tested and can't drift from the page.
import type { Dictionary } from "./dictionaries/en.ts";
import type { Project, Social } from "./profile.ts";

// Crawlers used by AI search and assistants. Allowed explicitly (not just via `*`) so a future
// catch-all rule can't silently block them, and so the intent is visible in robots.txt.
export const aiCrawlers = [
  "GPTBot", // OpenAI training
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User", // ChatGPT browsing on a user's behalf
  "ClaudeBot", // Anthropic training
  "Claude-SearchBot", // Claude search
  "Claude-User", // Claude fetching on a user's behalf
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini / AI Overviews opt-in
  "Applebot-Extended", // Apple Intelligence
  "meta-externalagent",
  "CCBot", // Common Crawl, used by many open models
];

export type SiteData = {
  siteUrl: string;
  name: string;
  photoSrc: string | null;
  socials: Social[];
  projects: Project[];
};

const sameAs = (socials: Social[]) => socials.filter((s) => s.href.startsWith("https://")).map((s) => s.href);

/** /llms.txt (https://llmstxt.org): a Markdown summary with links, in the default language. */
export function buildLlmsTxt(site: SiteData, t: Dictionary, languages: { locale: string; label: string }[]): string {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${t.headline}. ${t.studying}. ${t.location}.`,
    "",
    ...t.about.flatMap((p) => [p, ""]),
    "## Pages",
    "",
    ...languages.map(({ locale, label }) => `- [${label}](${site.siteUrl}/${locale}): personal site in ${label}`),
    "",
    "## Projects",
    "",
    ...site.projects.map((p) => {
      const demos = (p.demos ?? []).map((d) => `[${t.projects[p.id].demos[d.id]}](${d.href})`).join(", ");
      return (
        `- [${p.name}](${p.repo}): ${t.projects[p.id].description}` +
        ` Technologies: ${p.tech.join(", ")}.` +
        (demos ? ` Live: ${demos}.` : "")
      );
    }),
    "",
    "## Contact",
    "",
    ...site.socials.map((s) => `- [${s.label}](${s.href})`),
    `- Contact form: ${site.siteUrl}/${languages[0].locale}#contact`,
    "",
    "## Optional",
    "",
    `- [Sitemap](${site.siteUrl}/sitemap.xml)`,
    "",
  ];
  return lines.join("\n");
}

/** schema.org JSON-LD for one locale: the Person and the WebSite. */
export function buildJsonLd(site: SiteData, t: Dictionary, locale: string) {
  const pageUrl = `${site.siteUrl}/${locale}`;
  const person = {
    "@type": "Person",
    "@id": `${site.siteUrl}/#person`,
    name: site.name,
    url: pageUrl,
    description: `${t.headline}. ${t.studying}.`,
    ...(site.photoSrc ? { image: `${site.siteUrl}${site.photoSrc}` } : {}),
    sameAs: sameAs(site.socials),
    knowsAbout: [...new Set(site.projects.flatMap((p) => p.tech))],
  };
  const website = {
    "@type": "WebSite",
    "@id": `${site.siteUrl}/#website`,
    url: site.siteUrl,
    name: site.name,
    inLanguage: locale,
    publisher: { "@id": person["@id"] },
  };
  return { "@context": "https://schema.org", "@graph": [person, website] };
}

/** JSON for an inline <script>: `<` escaped so content can never close the tag. */
export const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
