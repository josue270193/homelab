import { ImageResponse } from "next/og";
import { getDictionary } from "@/content/dictionaries";
import { defaultLocale, hasLocale, locales } from "@/content/i18n";
import { profile } from "@/content/profile";

// Generated at build time per locale (headline translated); also used as the Twitter card image.
// The alt text is static per file, so it stays language-neutral.
export const alt = `${profile.name} · josuedev.dpdns.org`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDictionary(hasLocale(lang) ? lang : defaultLocale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#070b0d",
          color: "#e6f1f2",
        }}
      >
        <div style={{ fontSize: 32, color: "#2cd5c4" }}>josuedev.dpdns.org</div>
        <div style={{ fontSize: 88, fontWeight: 700, marginTop: 16 }}>{profile.name}</div>
        <div style={{ fontSize: 40, color: "#93a7ab", marginTop: 16 }}>{t.headline}</div>
      </div>
    ),
    size,
  );
}
