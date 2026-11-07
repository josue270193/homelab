import type { Dictionary } from "./en";

// "Desarrollador", not "Ingeniero": in Argentina "Ingeniero" implies a registered engineering degree.
export const es: Dictionary = {
  headline: "Desarrollador full-stack · Java/Spring + TypeScript/React",
  studying: "Estudiante de Inteligencia Artificial Aplicada (Python)",
  location: "Alemania",
  greeting: "Hola, soy",
  about: [
    "Me encanta programar: desde APIs con Spring Boot hasta front ends en React, y últimamente machine learning con Python.",
    "Fuera del trabajo soy gamer y adicto al helado, y quiero viajar por el mundo para conocer otras culturas e involucrarme con ellas.",
  ],
  downloadCv: "Descargar CV",
  photoAlt: "Foto de Josue Lopez",
  skipToContent: "Saltar al contenido",
  languageLabel: "Idioma",
  sectionsLabel: "Secciones",
  nav: { about: "sobre mí", projects: "proyectos", contact: "contacto" },
  sections: { about: "Sobre mí", projects: "Proyectos", contact: "Contacto" },
  technologies: "Tecnologías",
  sourceCode: "Código fuente",
  sourceCodeOf: (project: string) => ` de ${project}`,
  live: "En vivo",
  opensInNewTab: "(se abre en una pestaña nueva)",
  contactIntro: "¿Quieres trabajar juntos o simplemente saludar? Encuéntrame aquí:",
  contactForm: {
    title: "O envíame un mensaje",
    name: "Nombre",
    email: "Email",
    message: "Mensaje",
    send: "Enviar mensaje",
    sending: "Enviando…",
    success: "¡Gracias! Tu mensaje está en camino, te responderé pronto.",
    error: "Lo siento, no se pudo enviar el mensaje. Inténtalo más tarde o escríbeme por los enlaces de arriba.",
    captcha: "Completa la verificación e inténtalo de nuevo.",
    rateLimited: "Demasiados mensajes desde tu conexión. Inténtalo de nuevo en una hora.",
    invalid: {
      name: "Escribe tu nombre (hasta 100 caracteres).",
      email: "Escribe un email válido.",
      message: "Escribe entre 10 y 2000 caracteres.",
    },
    privacy: "Tu mensaje me llega por Telegram y no se guarda en este sitio.",
  },
  footer: "alojado en mi homelab",
  theme: { label: "Tema", switchTo: "Cambiar a", system: "sistema", light: "claro", dark: "oscuro" },
  projects: {
    homelab: {
      description:
        "Plataforma Docker autoalojada donde corre este sitio: Traefik v3 detrás de un Cloudflare Tunnel, Postgres con backups nocturnos, una API en Spring Boot, alertas de Uptime Kuma a Telegram e imágenes multiarquitectura construidas en GitHub Actions.",
      demos: { whoami: "whoami (eco de la petición)", api: "estado de la API" },
    },
  },
};
