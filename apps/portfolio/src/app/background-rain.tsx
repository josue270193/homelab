"use client";

import { useEffect, useRef } from "react";

// Matrix-style digital rain (#108): faint glyphs falling behind the content on a
// half-resolution canvas (fewer pixels to paint, naturally softer glyphs), with a
// light CSS blur on top (see background-rain in globals.css). The color is the
// --primary token, re-read on every step, so the theme toggle recolors the rain
// live; per-theme opacity (--rain-opacity) keeps it subtle on light and dark.
// requestAnimationFrame stops firing in background tabs, so the rain pauses when
// the page is not visible. At prefers-reduced-motion a single static frame is
// drawn instead of the animation.

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃ0123456789";
const FONT_SIZE = 20; // canvas units (~10 CSS px at RESOLUTION)
const STEP_MS = 70; // one row of motion per tick: a slow drift, not a rush
const RESOLUTION = 0.5; // canvas pixels per CSS px

export function BackgroundRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: number[] = [];
    let raf = 0;
    let last = performance.now();

    const primaryColor = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();

    const layout = () => {
      width = canvas.width = Math.max(1, Math.round(canvas.clientWidth * RESOLUTION));
      height = canvas.height = Math.max(1, Math.round(canvas.clientHeight * RESOLUTION));
      columns = Math.ceil(width / FONT_SIZE);
      drops = Array.from({ length: columns }, () =>
        Math.floor(Math.random() * (height / FONT_SIZE)),
      );
    };

    // fade: 0 < alpha < 1 fades existing pixels toward transparent (trail length).
    const draw = (fade: number) => {
      if (fade > 0) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = primaryColor();
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textAlign = "center";
      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx.fillText(glyph, i * FONT_SIZE + FONT_SIZE / 2, drops[i] * FONT_SIZE);
        if (drops[i] * FONT_SIZE > height && Math.random() > 0.976) drops[i] = 0;
        drops[i] += 1;
      }
    };

    const frame = (now: number) => {
      if (now - last >= STEP_MS) {
        draw(0.14);
        last = now;
      }
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      layout();
      if (reduced) draw(0);
    };

    layout();
    if (reduced) {
      draw(0); // one static, scattered frame; no loop
    } else {
      raf = requestAnimationFrame(frame);
    }

    // The animated path re-reads --primary every step, so it follows the toggle by
    // itself; the static frame needs a nudge.
    const observer = new MutationObserver(() => {
      if (reduced) draw(0);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="background-rain" />;
}
