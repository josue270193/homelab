# portfolio

Personal portfolio website, a subproject of this homelab (epic **E9**, issues #70–#78).
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.

## Run locally

Needs Node ≥ 20.9 (`npm test` needs ≥ 22.18, which runs TypeScript directly; CI and Docker use 24).

```bash
cd apps/portfolio
npm ci
npm run dev       # http://localhost:3000
npm run lint
npm test          # unit tests (node --test)
npm run build     # production build, also produces .next/standalone
```

## Content and languages

The site is in English, Spanish and German, at `/en`, `/es` and `/de`. All three are static pages.
Content lives in two places:

- [`src/content/profile.ts`](src/content/profile.ts): language-neutral data (name, links, repos,
  tech names, demo URLs).
- [`src/content/dictionaries/`](src/content/dictionaries): everything a visitor reads as prose
  (headline, about, section titles, button labels, screen-reader hints), one file per locale.
  `en.ts` defines the shape and `es.ts` / `de.ts` must match it, so a missing key fails
  `npm run build` (TypeScript).

To add a project, add it to `projects` in `profile.ts` (with an `id`) and add its texts under
`projects.<id>` in **every** dictionary. To add a language, add it to `locales` in
[`src/content/i18n.ts`](src/content/i18n.ts) and create its dictionary.

Routes live under `src/app/[lang]/`. [`src/proxy.ts`](src/proxy.ts) redirects `/` with a 307 to the
visitor's language, using the first of these that applies:

1. the `lang` cookie: an explicit choice always wins;
2. the country from Cloudflare's `CF-IPCountry` header, mapped by `countryLocale` in
   [`locale-detection.ts`](src/content/locale-detection.ts): Spanish-speaking countries → `es`,
   DE/AT/CH/LI → `de`, any other country → `en`;
3. `Accept-Language`, only when there is no country (local dev, tailnet, Cloudflare's `XX`/`T1`);
4. `en`.

The **language switcher** (EN · ES · DE, next to the theme toggle,
[`language-switcher.tsx`](src/app/language-switcher.tsx)) uses plain links to `/{lang}`, so it works
without JavaScript. With JavaScript, a click also sets the `lang` cookie (1 year, `SameSite=Lax`,
`Secure` on HTTPS) and keeps the current `#section`. Each link has `hreflang`/`lang` so screen
readers pronounce the language name correctly, and the current one has `aria-current`.

The redirect is `Cache-Control: private, no-store` (the answer depends on the visitor). The pages
themselves stay static. `npm test` runs the unit tests for this decision (Node's built-in test runner,
also in CI). Each page has hreflang alternates (`x-default` → `/en`) and a
canonical URL, `sitemap.xml` lists all three, and the Open Graph image is rendered per locale with
the translated headline. `/api/*`, `robots.txt` and `sitemap.xml` are not localized.

Wording: "Desarrollador" / "Entwickler" rather than "Ingeniero" / "Ingenieur", which are regulated
titles in Argentina and Germany.

## Contact form

Below the social links, the form (name, email, message) posts to `POST /api/contact`. That endpoint
validates again on the server ([`src/lib/contact.ts`](src/lib/contact.ts): name ≤ 100, valid email
≤ 200, message 10–2000 characters, control characters stripped) and sends a **plain-text** message to
a dedicated Telegram bot ([`src/lib/telegram.ts`](src/lib/telegram.ts), 5 s timeout).

| Variable (`.env`) | |
|---|---|
| `CONTACT_ENABLED` | `true` to show and accept the form. Default `false`. **Keep it `false` in production until #77** (Turnstile, honeypot, rate limit). |
| `CONTACT_TELEGRAM_BOT_TOKEN` | Token of a bot made for this, via @BotFather (not Uptime Kuma's). Secret; server only. |
| `CONTACT_TELEGRAM_CHAT_ID` | Your numeric Telegram user id, e.g. from @userinfobot. Press **Start** in the new bot once, or it can't message you. |

- The page is static, so the form asks `GET /api/contact` whether it is enabled and renders nothing
  otherwise.
- Responses: `400` invalid (with the field names), `413` body too large, `502` Telegram failed
  (generic message to the visitor; the reason goes to the server log without the token), `503`
  disabled.
- Without JavaScript the form doesn't appear; the social links remain.

## Design system

Minimalist, with a light gamer/HUD touch and a blue-green primary color. The tokens are defined once
in [`src/app/globals.css`](src/app/globals.css) as CSS variables, which Tailwind 4 `@theme` turns into
utilities. Components use only these, never raw palette classes (`zinc-*`, `teal-*`) or `dark:`
variants. A theme switch is just a new set of variables.

| Token | Utility | Light | Dark | Use |
|---|---|---|---|---|
| `--bg` | `bg-bg` | `#f8fafa` | `#070b0d` | page background |
| `--surface` | `bg-surface` | `#ffffff` | `#0e1518` | cards, buttons |
| `--fg` | `text-fg` | `#0b1416` | `#e6f1f2` | headings, body text |
| `--muted` | `text-muted` | `#4a5a5e` | `#93a7ab` | secondary text, tags |
| `--border` | `border-border` | `#d5e0e1` | `#1f2d31` | decorative borders only |
| `--primary` | `text-primary`, `bg-primary`, `outline-primary` | `#0a7480` | `#2cd5c4` | accents, links, focus |
| `--primary-fg` | `text-primary-fg` | `#ffffff` | `#04211f` | text on `bg-primary` |

Contrast (WCAG 2.x; AA needs 4.5:1 for body text, 3:1 for large text and UI):

| Pair | Light | Dark |
|---|---|---|
| fg on bg / surface | 17.8 / 18.7 | 17.2 / 16.0 |
| muted on bg / surface | 6.9 / 7.2 | 7.9 / 7.3 |
| primary on bg / surface | 5.2 / 5.5 | 10.8 / 10.0 |
| primary-fg on primary | 5.5 | 9.2 |

`--border` (about 1.3:1) is decorative: never the only thing that marks a control's edge or state.

Other tokens: `rounded-control` (0.5rem: buttons, chips) and `rounded-card` (0.75rem), plus
`shadow-glow` (a primary edge and soft glow, **on hover/focus only**).

Gamer touches (keep them few):

- Geist Mono for labels, nav, tags and the footer.
- `> Hi, I'm_` with a blinking caret (`caret`, which stops under `prefers-reduced-motion`).
- Numbered section titles (`01`, `02`, ...).
- `hud-corners`: primary brackets on two corners of a card.

No extra fonts, images or background effects.

### Theme (light/dark)

The toggle in the header cycles through three states and saves the choice in `localStorage` (key `theme`):

- **System** (default): no stored key. The `prefers-color-scheme` media query decides and follows OS changes live.
- **Light** / **Dark**: sets `data-theme` on `<html>`, which overrides the media query in `globals.css`.

The inline script in `<head>` ([`theme-script.ts`](src/app/theme-script.ts)) applies the stored choice
before first paint, so there is no flash of the wrong theme. The toggle also pins the `theme-color` meta
to the chosen theme, and other tabs follow through the `storage` event.

- Without JavaScript the toggle doesn't render and the OS theme applies.
- If storage is blocked, the choice still applies to the current page view.

`dark:` utilities follow the same rule through a custom variant, though components don't need them:
the tokens already switch.

### Buttons

Action links (project repo, live demos, socials) use
[`LinkButton`](src/app/link-button.tsx). It is still an `<a>`; inline text links (nav, footer) stay
plain links.

| Variant | Look | Used for |
|---|---|---|
| `primary` | blue-green fill | the main action, e.g. "Source code" |
| `secondary` (default) | outline on surface | demos, social links |
| `ghost` | text only, `primary/10` background on hover | low-emphasis actions |

Sizes: `sm` and `md`. Optional `icon`. External links get `target=_blank` + `noopener noreferrer` and
"(opens in a new tab)" for screen readers. `srLabel` adds context, e.g. which project.

Motion (150 ms, `transform` / color / shadow only, so no layout shift):

- Hover: lifts 1 px and gets the glow.
- Press: scales to 0.97.
- The movement is behind `motion-safe:`, so `prefers-reduced-motion` keeps only the color changes.
- Hover styles only apply on devices that can hover (Tailwind 4 default), so touch screens don't get stuck hover states.

## Docker

```bash
docker build -t homelab-portfolio:dev .
docker run --rm -p 127.0.0.1:3000:3000 homelab-portfolio:dev
curl http://localhost:3000/api/health   # {"status":"UP"}
```

Multi-stage on `node:24.22.1-alpine3.24`. It runs as the non-root `node` user, and the
`HEALTHCHECK` polls `/api/health`. The build stages run on `$BUILDPLATFORM`, so
`--platform linux/amd64,linux/arm64` builds without emulating npm.

## CI and images

[`.github/workflows/portfolio-image.yml`](../../.github/workflows/portfolio-image.yml) runs on every PR
and push to `main` that touches `apps/portfolio/`:

1. `npm ci` + `npm run lint` on Node 24.22.1 (same as the image).
2. Builds `linux/amd64` + `linux/arm64` with buildx (`next build` runs in the image build).
3. Starts the amd64 image and waits for `healthy`. Then it checks `/api/health` and that the home page renders.
4. **Only on `main`**, after the smoke test: pushes `ghcr.io/josue270193/homelab-portfolio` with tags
   `latest` and `sha-<short commit sha>`. Pull requests never push.

```bash
docker pull ghcr.io/josue270193/homelab-portfolio:latest   # or :sha-<short sha> to pin a build
```

## Notes

- `output: "standalone"` in `next.config.ts`: the build emits a self-contained `server.js` with only
  the needed `node_modules`, used by the Docker image (#71).
- Versions are pinned exactly in `package.json` (Next.js picked a few days after release, not the same-day patch).
- `npm audit` reports moderate issues only in dev tooling (ESLint → `minimatch`); runtime deps:
  `npm audit --omit=dev` → 0.
- Telemetry: set `NEXT_TELEMETRY_DISABLED=1` (CI and Docker do).

## Roadmap (E9)

Scaffold (#70) → Dockerfile + health (#71) → CI to GHCR (#72) → apex domain (#73) → content (#74)
→ CV download (#75) → contact via Telegram (#76) → bot protection (#77) → optional email (#78).
