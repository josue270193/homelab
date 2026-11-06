// English texts; the shape every other locale must match (a missing key fails the build).

export const en = {
  headline: "Full-stack engineer · Java/Spring + TypeScript/React",
  studying: "Applied Artificial Intelligence student (Python)",
  location: "Germany",
  greeting: "Hi, I'm",
  about: [
    "I love programming: from Spring Boot APIs to React front ends, and lately machine learning with Python.",
    "Outside work I'm a gamer and an ice-cream addict who wants to travel the world to meet and get involved with different cultures.",
  ],
  skipToContent: "Skip to content",
  sectionsLabel: "Sections",
  nav: { about: "about", projects: "projects", contact: "contact" },
  sections: { about: "About", projects: "Projects", contact: "Contact" },
  technologies: "Technologies",
  sourceCode: "Source code",
  sourceCodeOf: (project: string) => ` of ${project}`,
  live: "Live",
  opensInNewTab: "(opens in a new tab)",
  contactIntro: "Want to work together or just say hi? Find me here:",
  footer: "self-hosted on my homelab",
  theme: { label: "Theme", switchTo: "Switch to", system: "system", light: "light", dark: "dark" },
  projects: {
    homelab: {
      description:
        "Self-hosted Docker platform this site runs on: Traefik v3 behind a Cloudflare Tunnel, Postgres with nightly backups, a Spring Boot API, Uptime Kuma alerts to Telegram, and multi-arch images built in GitHub Actions.",
      demos: { whoami: "whoami (request echo)", api: "API health" },
    },
  },
};

export type Dictionary = typeof en;
