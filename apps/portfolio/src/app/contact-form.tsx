"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Dictionary } from "@/content/dictionaries";
import type { Locale } from "@/content/i18n";
import { HONEYPOT_FIELD, limits, validateContact, type ContactField } from "@/lib/contact";
import { buttonClass } from "./link-button";

// Contact form (#76) with bot protection (#77). The page is static, so it asks /api/contact whether
// the form is enabled (and for the public Turnstile site key) and renders nothing otherwise.
// Validation runs here for instant, localized feedback, and again on the server, which decides.

type Status = "idle" | "sending" | "sent" | "error" | "captcha" | "rateLimited";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

// Must load from Cloudflare directly (no proxy/cache), per Turnstile's docs.
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(script);
  });
}

const field =
  "mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-fg " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "aria-invalid:border-danger";

export function ContactForm({ t, locale }: { t: Dictionary["contactForm"]; locale: Locale }) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState<ContactField[]>([]);
  const widgetBox = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const captchaToken = useRef("");

  useEffect(() => {
    fetch("/api/contact")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => setSiteKey(data.enabled === true && data.siteKey ? data.siteKey : null))
      .catch(() => setSiteKey(null));
  }, []);

  // Turnstile only loads when the form is actually shown.
  useEffect(() => {
    if (!siteKey || !widgetBox.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetBox.current) return;
        widgetId.current = turnstile.render(widgetBox.current, {
          sitekey: siteKey,
          language: locale,
          theme: document.documentElement.dataset.theme ?? "auto",
          callback: (token: string) => (captchaToken.current = token),
          "expired-callback": () => (captchaToken.current = ""),
          "error-callback": () => (captchaToken.current = ""),
        });
      })
      .catch(() => setStatus("error"));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, locale]);

  if (!siteKey) return null;

  // Tokens are single-use: get a fresh one after every attempt.
  const resetCaptcha = () => {
    captchaToken.current = "";
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const check = validateContact(values);
    if (!check.ok) {
      setInvalid(check.fields);
      form.querySelector<HTMLElement>(`[name="${check.fields[0]}"]`)?.focus();
      return;
    }
    setInvalid([]);
    if (!captchaToken.current) {
      setStatus("captcha");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...check.value,
          [HONEYPOT_FIELD]: values[HONEYPOT_FIELD] ?? "",
          turnstileToken: captchaToken.current,
          locale,
        }),
      });
      resetCaptcha();
      if (res.ok) {
        form.reset();
        setStatus("sent");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) return setStatus("rateLimited");
      if (data.error === "captcha") return setStatus("captcha");
      if (res.status === 400 && Array.isArray(data.fields)) {
        setInvalid(data.fields);
        setStatus("idle");
        return;
      }
      setStatus("error");
    } catch {
      resetCaptcha();
      setStatus("error");
    }
  }

  const error = (name: ContactField) =>
    invalid.includes(name) ? (
      <p id={`${name}-error`} className="mt-1 text-sm text-danger">
        {t.invalid[name]}
      </p>
    ) : null;
  const a11y = (name: ContactField) => ({
    "aria-invalid": invalid.includes(name) || undefined,
    "aria-describedby": invalid.includes(name) ? `${name}-error` : undefined,
  });
  const message = { sent: t.success, error: t.error, captcha: t.captcha, rateLimited: t.rateLimited }[
    status as "sent" | "error" | "captcha" | "rateLimited"
  ];

  return (
    <form noValidate onSubmit={submit} aria-labelledby="contact-form-title" className="relative mt-10 max-w-xl">
      <h3 id="contact-form-title" className="text-lg font-semibold">
        {t.title}
      </h3>
      {/* Honeypot: off-screen (not display:none, which some bots skip), hidden from people and AT. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          {t.name}
          <input name="name" autoComplete="name" required maxLength={limits.name} className={field} {...a11y("name")} />
          {error("name")}
        </label>
        <label className="block text-sm font-medium">
          {t.email}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={limits.email}
            className={field}
            {...a11y("email")}
          />
          {error("email")}
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium">
        {t.message}
        <textarea
          name="message"
          rows={5}
          required
          minLength={limits.messageMin}
          maxLength={limits.messageMax}
          className={`${field} resize-y`}
          {...a11y("message")}
        />
        {error("message")}
      </label>
      <div ref={widgetBox} className="mt-4 min-h-[65px]" />
      <p className="mt-3 text-xs text-muted">{t.privacy}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={status === "sending"} className={`${buttonClass("primary")} disabled:opacity-60`}>
          {status === "sending" ? t.sending : t.send}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${status === "sent" ? "text-primary" : "text-danger"}`}>
          {message ?? ""}
        </p>
      </div>
    </form>
  );
}
