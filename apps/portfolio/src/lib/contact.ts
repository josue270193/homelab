// Contact form rules (#76), shared by the form (client-side hints) and /api/contact (the real check).

export const limits = { name: 100, email: 200, messageMin: 10, messageMax: 2000 } as const;

export type ContactInput = { name: string; email: string; message: string };
export type ContactField = keyof ContactInput;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Control characters (except newline and tab in the message) never belong in a contact message.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const clean = (value: unknown) => (typeof value === "string" ? value.replace(CONTROL, "").trim() : "");

export function validateContact(
  raw: unknown,
): { ok: true; value: ContactInput } | { ok: false; fields: ContactField[] } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const value = { name: clean(body.name), email: clean(body.email), message: clean(body.message) };
  const fields: ContactField[] = [];
  if (!value.name || value.name.length > limits.name) fields.push("name");
  if (value.email.length > limits.email || !EMAIL.test(value.email)) fields.push("email");
  if (value.message.length < limits.messageMin || value.message.length > limits.messageMax) fields.push("message");
  return fields.length ? { ok: false, fields } : { ok: true, value };
}

// Plain text on purpose: no parse_mode, so nothing a visitor types is interpreted as markup.
export function formatContactMessage(input: ContactInput, locale: string): string {
  return `📬 Portfolio contact (${locale})\nFrom: ${input.name} <${input.email}>\n\n${input.message}`;
}
