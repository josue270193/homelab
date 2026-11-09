// Animated background (#108): two slow-drifting primary-tinted glows, pure CSS
// (keyframes and utilities in globals.css). Decorative only: aria-hidden, no JS,
// no interactivity. Static at prefers-reduced-motion; the browser pauses CSS
// animations while the tab is hidden, so it costs nothing off-screen.
export function BackgroundAnimation() {
  return (
    <div aria-hidden="true" className="background-animation">
      <div className="background-glow background-glow-a" />
      <div className="background-glow background-glow-b" />
    </div>
  );
}
