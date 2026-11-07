"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Dictionary } from "@/content/dictionaries";
import type { Locale } from "@/content/i18n";
import { limits, validateContact, type ContactField } from "@/lib/contact";
import { buttonClass } from "./link-button";

// Contact form (#76). The page is static, so it asks /api/contact whether the form is enabled and
// renders nothing otherwise (production stays without it until bot protection, #77, is in).
// Validation runs here for instant, localized feedback, and again on the server, which decides.

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-fg " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "aria-invalid:border-danger";

export function ContactForm({ t, locale }: { t: Dictionary["contactForm"]; locale: Locale }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState<ContactField[]>([]);

  useEffect(() => {
    fetch("/api/contact")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => setEnabled(data.enabled === true))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

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
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...check.value, locale }),
      });
      if (res.ok) {
        form.reset();
        setStatus("sent");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && Array.isArray(data.fields)) {
        setInvalid(data.fields);
        setStatus("idle");
        return;
      }
      setStatus("error");
    } catch {
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

  return (
    <form noValidate onSubmit={submit} aria-labelledby="contact-form-title" className="mt-10 max-w-xl">
      <h3 id="contact-form-title" className="text-lg font-semibold">
        {t.title}
      </h3>
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
      <p className="mt-3 text-xs text-muted">{t.privacy}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={status === "sending"} className={`${buttonClass("primary")} disabled:opacity-60`}>
          {status === "sending" ? t.sending : t.send}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-danger" : "text-primary"}`}>
          {status === "sent" ? t.success : status === "error" ? t.error : ""}
        </p>
      </div>
    </form>
  );
}
