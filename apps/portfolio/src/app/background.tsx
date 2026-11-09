// Animated background (#108): matrix-style digital rain (background-rain.tsx, client
// canvas) over two slow-drifting primary-tinted glows (pure CSS, globals.css).
// Decorative only: aria-hidden, no interactivity. Static at prefers-reduced-motion;
// rAF/CSS animations pause while the tab is hidden, so it costs nothing off-screen.
import { BackgroundRain } from "./background-rain";

export function BackgroundAnimation() {
  return (
    <div aria-hidden="true" className="background-animation">
      <div className="background-glow background-glow-a" />
      <div className="background-glow background-glow-b" />
      <BackgroundRain />
    </div>
  );
}
