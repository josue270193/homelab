import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { defaultLocale, hasLocale, locales } from "@/content/i18n";
import { profile, siteUrl } from "@/content/profile";
import { themeColors, themeScript } from "../theme-script";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// One static page per locale (#90): /en, /es, /de.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// hreflang alternates: every locale plus x-default, the same on every page.
const languages = {
  ...Object.fromEntries(locales.map((l) => [l, `/${l}`])),
  "x-default": `/${defaultLocale}`,
};

// Open Graph / Twitter images come from [lang]/opengraph-image.tsx; URLs resolve against metadataBase.
export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const title = `${profile.name}: ${t.headline}`;
  const description = `${t.headline}. ${t.studying} · ${t.location}.`;
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: `/${lang}`, languages },
    openGraph: { type: "website", url: `/${lang}`, siteName: profile.name, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColors.light },
    { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
