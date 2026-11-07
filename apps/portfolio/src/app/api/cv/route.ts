import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { hasLocale } from "@/content/i18n";

// CV download (#75). The PDF has personal data and the repo is public, so it is never in the image:
// data/portfolio/ on the host is mounted read-only at CV_DIR. Replacing the file needs no rebuild.
// `?lang=es` serves cv-es.pdf when present, else cv.pdf. No file -> 404 (the button hides itself).

const CV_DIR = process.env.CV_DIR ?? "/app/cv";

async function findCv(lang: string | null): Promise<{ path: string; suffix: string } | null> {
  const candidates = [
    ...(lang && hasLocale(lang) ? [{ path: join(CV_DIR, `cv-${lang}.pdf`), suffix: `-${lang.toUpperCase()}` }] : []),
    { path: join(CV_DIR, "cv.pdf"), suffix: "" },
  ];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate.path)).isFile()) return candidate;
    } catch {
      // missing or unreadable: try the next one
    }
  }
  return null;
}

const headers = (suffix: string) => ({
  "Content-Type": "application/pdf",
  "Content-Disposition": `attachment; filename="Josue-Lopez-CV${suffix}.pdf"`,
  // Replaced files show up immediately; and keep personal data out of search engines.
  "Cache-Control": "no-cache",
  "X-Robots-Tag": "noindex",
});

export async function GET(request: Request) {
  const cv = await findCv(new URL(request.url).searchParams.get("lang"));
  if (!cv) return new Response("Not found", { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(cv.path)), { headers: headers(cv.suffix) });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// Lets the button check for the file without downloading it.
export async function HEAD(request: Request) {
  const cv = await findCv(new URL(request.url).searchParams.get("lang"));
  return new Response(null, cv ? { headers: headers(cv.suffix) } : { status: 404 });
}
