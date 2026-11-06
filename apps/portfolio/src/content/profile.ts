// Language-neutral data: links, repos, tech names. Anything a visitor reads as prose lives in
// src/content/dictionaries/<locale>.ts (#90). Components only read from these two places (#74).

export const siteUrl = "https://josuedev.dpdns.org";

export const profile = {
  name: "Josue Lopez",
};

export type Social = { label: string; href: string; icon: "github" | "linkedin" | "steam" | "email" };

// Shown in the contact section. Brand names, so not translated.
export const socials: Social[] = [
  { label: "GitHub", href: "https://github.com/josue270193", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/josue-david/", icon: "linkedin" },
  { label: "Steam", href: "https://steamcommunity.com/profiles/76561197989703136/", icon: "steam" },
  // { label: "Email", href: "mailto:<you>@<domain>", icon: "email" },
];

// `id` keys the project's texts in the dictionaries (projects.<id>).
export type Project = {
  id: "homelab";
  name: string;
  tech: string[];
  repo: string;
  demos?: { id: "whoami" | "api"; href: string }[];
};

export const projects: Project[] = [
  {
    id: "homelab",
    name: "Homelab",
    tech: ["Docker Compose", "Traefik", "Cloudflare Tunnel", "Spring Boot", "Next.js", "GitHub Actions"],
    repo: "https://github.com/josue270193/homelab",
    demos: [
      { id: "whoami", href: "https://whoami.josuedev.dpdns.org" },
      { id: "api", href: "https://api.josuedev.dpdns.org/actuator/health" },
    ],
  },
];
