import type { Dictionary } from "./en";

// "Entwickler", not "Ingenieur": in Germany "Ingenieur" is a legally protected title (needs a degree).
export const de: Dictionary = {
  headline: "Full-Stack-Entwickler · Java/Spring + TypeScript/React",
  studying: "Student der Angewandten Künstlichen Intelligenz (Python)",
  location: "Deutschland",
  greeting: "Hi, ich bin",
  about: [
    "Ich liebe Programmieren: von Spring-Boot-APIs bis zu React-Frontends und neuerdings Machine Learning mit Python.",
    "Privat bin ich Gamer und Eis-Fan und möchte die Welt bereisen, um verschiedene Kulturen kennenzulernen und in sie einzutauchen.",
  ],
  skipToContent: "Zum Inhalt springen",
  languageLabel: "Sprache",
  sectionsLabel: "Abschnitte",
  nav: { about: "über mich", projects: "projekte", contact: "kontakt" },
  sections: { about: "Über mich", projects: "Projekte", contact: "Kontakt" },
  technologies: "Technologien",
  sourceCode: "Quellcode",
  sourceCodeOf: (project: string) => ` von ${project}`,
  live: "Live",
  opensInNewTab: "(öffnet in neuem Tab)",
  contactIntro: "Lust auf Zusammenarbeit oder einfach Hallo sagen? Hier findest du mich:",
  contactForm: {
    title: "Oder schreib mir eine Nachricht",
    name: "Name",
    email: "E-Mail",
    message: "Nachricht",
    send: "Nachricht senden",
    sending: "Wird gesendet…",
    success: "Danke! Deine Nachricht ist unterwegs, ich melde mich bald.",
    error: "Die Nachricht konnte leider nicht gesendet werden. Versuch es später noch einmal oder schreib mir über die Links oben.",
    invalid: {
      name: "Bitte gib deinen Namen ein (bis zu 100 Zeichen).",
      email: "Bitte gib eine gültige E-Mail-Adresse ein.",
      message: "Bitte schreib zwischen 10 und 2000 Zeichen.",
    },
    privacy: "Deine Nachricht wird mir per Telegram zugestellt und nicht auf dieser Seite gespeichert.",
  },
  footer: "selbst gehostet in meinem Homelab",
  theme: { label: "Farbschema", switchTo: "Wechseln zu", system: "System", light: "hell", dark: "dunkel" },
  projects: {
    homelab: {
      description:
        "Selbst gehostete Docker-Plattform, auf der diese Seite läuft: Traefik v3 hinter einem Cloudflare Tunnel, Postgres mit nächtlichen Backups, eine Spring-Boot-API, Uptime-Kuma-Alarme per Telegram und Multi-Arch-Images aus GitHub Actions.",
      demos: { whoami: "whoami (Request-Echo)", api: "API-Status" },
    },
  },
};
