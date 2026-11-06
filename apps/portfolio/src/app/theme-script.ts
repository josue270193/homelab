// Theme choice shared by the inline <head> script and the toggle (#87).
// "system" is stored as "no key", so the CSS media query decides.

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "theme";

// Must match --bg in globals.css; used for the browser UI color (theme-color meta).
export const themeColors = { light: "#f8fafa", dark: "#070b0d" } as const;

// Runs before first paint so an explicit choice never flashes the OS theme first.
// Plain ES5 string: it is inlined as-is, not bundled.
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
