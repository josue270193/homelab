// Single source for everything the site says about me: page, metadata, OG image, sitemap.
// Edit here; components only read it (#74).

export const siteUrl = "https://josuedev.dpdns.org";

export const profile = {
  name: "Josue Lopez",
  headline: "Full-stack engineer · Java/Spring + TypeScript/React",
  studying: "Applied Artificial Intelligence student (Python)",
  location: "Germany",
  about: [
    "I love programming: from Spring Boot APIs to React front ends, and lately machine learning with Python.",
    "Outside work I'm a gamer and an ice-cream addict who wants to travel the world to meet and get involved with different cultures.",
  ],
};

export type Social = { label: string; href: string; icon: "github" | "linkedin" | "steam" | "email" };

// Shown in the contact section and the footer. An entry without href is skipped.
export const socials: Social[] = [
  { label: "GitHub", href: "https://github.com/josue270193", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/josue-david/", icon: "linkedin" },
  { label: "Steam", href: "https://steamcommunity.com/profiles/76561197989703136/", icon: "steam" },
  // { label: "Email", href: "mailto:<you>@<domain>", icon: "email" },
];

export type Project = {
  name: string;
  description: string;
  tech: string[];
  repo: string;
  demos?: { label: string; href: string }[];
};

export const projects: Project[] = [
  {
    name: "Homelab",
    description:
      "Self-hosted Docker platform this site runs on: Traefik v3 behind a Cloudflare Tunnel, Postgres with nightly backups, a Spring Boot API, Uptime Kuma alerts to Telegram, and multi-arch images built in GitHub Actions.",
    tech: ["Docker Compose", "Traefik", "Cloudflare Tunnel", "Spring Boot", "Next.js", "GitHub Actions"],
    repo: "https://github.com/josue270193/homelab",
    demos: [
      { label: "whoami (request echo)", href: "https://whoami.josuedev.dpdns.org" },
      { label: "API health", href: "https://api.josuedev.dpdns.org/actuator/health" },
    ],
  },
];
