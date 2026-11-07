"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/content/i18n";
import { buttonClass } from "./link-button";

// "Download CV" (#75). The page is static and the PDF lives outside the image, so the button
// probes /api/cv first and only appears when a CV is actually there.
export function CvButton({ label, locale }: { label: string; locale: Locale }) {
  const href = `/api/cv?lang=${locale}`;
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch(`${href}&probe=1`)
      .then((res) => (res.ok ? res.json() : { available: false }))
      .then((data) => setAvailable(data.available === true))
      .catch(() => setAvailable(false));
  }, [href]);

  if (!available) return null;
  return (
    <a href={href} download className={`${buttonClass("primary", "sm")} mt-6`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
      {label}
    </a>
  );
}
