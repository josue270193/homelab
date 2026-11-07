// Runs before `next build` / `next dev` (npm prebuild/predev, #88): downloads the GitHub profile
// picture once and stores it as public/profile.webp, so visitors load it from this site and never
// contact GitHub (their IP stays here). Updates on every build. Never fails the build: on any error
// it removes the file and the page shows initials instead.
import { rm } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "https://github.com/josue270193.png?size=460";
const OUT = new URL("../public/profile.webp", import.meta.url);
const SIZE = 400;

try {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  // resize() crops to a square; sharp writes no EXIF/ICC/XMP unless asked (withMetadata).
  const info = await sharp(input).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 80 }).toFile(OUT.pathname);
  console.log(`avatar: ${SOURCE} -> public/profile.webp (${info.width}x${info.height}, ${info.size} bytes)`);
} catch (error) {
  await rm(OUT, { force: true });
  console.warn(`avatar: could not fetch (${error.message}); the page will show initials`);
}
