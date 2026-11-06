"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_KEY, themeColors, type ThemeChoice } from "./theme-script";

// Cycles System -> Light -> Dark (#87). The choice lives in localStorage; other tabs follow
// through the `storage` event. Without JavaScript nothing renders and the OS theme applies.

const order: ThemeChoice[] = ["system", "light", "dark"];
const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system"; // storage blocked (private mode, site data disabled)
  }
}

function write(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Not persisted, but still applied for this page view.
  }
  current = choice;
  listeners.forEach((l) => l());
}

let current: ThemeChoice | null = null;

function subscribe(onChange: () => void) {
  const onStorage = () => {
    current = read();
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (current ??= read());
const getServerSnapshot = () => null;

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  // Next renders one theme-color meta per color scheme; pin both to the chosen theme.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme = choice === "system" ? (meta.media.includes("dark") ? "dark" : "light") : choice;
    meta.content = themeColors[scheme];
  });
}

const labels: Record<ThemeChoice, string> = { system: "system", light: "light", dark: "dark" };

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (theme) apply(theme);
  }, [theme]);

  // Server render and no-JS: reserve the space so nothing shifts on hydration.
  if (!theme) return <span aria-hidden="true" className="inline-block h-10 w-10" />;

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const label = `Theme: ${labels[theme]}. Switch to ${labels[next]}`;

  return (
    <button
      type="button"
      onClick={() => write(next)}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface transition-[color,border-color,box-shadow,scale] duration-150 hover:border-primary hover:text-primary hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:active:scale-[0.97]"
    >
      <span key={theme} className="icon-in inline-flex">
        <ThemeIcon name={theme} />
      </span>
    </button>
  );
}

function ThemeIcon({ name }: { name: ThemeChoice }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "h-5 w-5 fill-none stroke-current",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "light")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  if (name === "dark")
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
