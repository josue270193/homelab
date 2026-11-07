import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { profile } from "@/content/profile";

// Profile picture in the intro (#88), with a primary ring + glow from the design system.
// Served as the pre-sized WebP from public/ (unoptimized): the optimizer would need sharp's native
// binary for the image's target arch, which the cross-built standalone image doesn't carry.
// The page is prerendered, so the file check below runs at build time, right after the fetch.
const frame = "h-24 w-24 shrink-0 rounded-full ring-2 ring-primary shadow-glow sm:h-32 sm:w-32";

export function Avatar({ alt }: { alt: string }) {
  const { photo, name } = profile;
  if (!photo || !existsSync(join(process.cwd(), photo.file))) {
    // No photo configured: initials. Decorative, since the name is the h1 right next to it.
    const initials = name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2);
    return (
      <div
        aria-hidden="true"
        className={`${frame} flex items-center justify-center bg-surface font-mono text-2xl text-primary sm:text-3xl`}
      >
        {initials}
      </div>
    );
  }
  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      alt={alt}
      sizes="(min-width: 640px) 128px, 96px"
      loading="eager"
      fetchPriority="high"
      unoptimized
      className={`${frame} object-cover`}
    />
  );
}
