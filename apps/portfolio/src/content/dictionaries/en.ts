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
  downloadCv: "Download CV",
  photoAlt: "Photo of Josue Lopez",
  skipToContent: "Skip to content",
  languageLabel: "Language",
  sectionsLabel: "Sections",
  nav: { about: "about", projects: "projects", contact: "contact" },
  sections: { about: "About", projects: "Projects", contact: "Contact" },
  technologies: "Technologies",
  sourceCode: "Source code",
  sourceCodeOf: (project: string) => ` of ${project}`,
  live: "Live",
  opensInNewTab: "(opens in a new tab)",
  contactIntro: "Want to work together or just say hi? Find me here:",
  contactForm: {
    title: "Or send me a message",
    name: "Name",
    email: "Email",
    message: "Message",
    send: "Send message",
    sending: "Sending…",
    success: "Thanks! Your message is on its way, I'll get back to you soon.",
    error: "Sorry, the message couldn't be sent. Please try again later or reach me through the links above.",
    captcha: "Please complete the verification and try again.",
    rateLimited: "Too many messages from your connection. Please try again in an hour.",
    invalid: {
      name: "Please enter your name (up to 100 characters).",
      email: "Please enter a valid email address.",
      message: "Please write between 10 and 2000 characters.",
    },
    privacy: "Your message is delivered to me via Telegram and is not stored on this site.",
  },
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
