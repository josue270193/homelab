import type { Locale } from "../i18n";
import { de } from "./de";
import { en, type Dictionary } from "./en";
import { es } from "./es";

// Server-side only in practice: pages pass the strings a client component needs as props.
const dictionaries: Record<Locale, Dictionary> = { en, es, de };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];
export type { Dictionary };
