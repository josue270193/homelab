import type { ReactNode } from "react";
import type { Social } from "@/content/profile";
import { Icon } from "./icons";

// A link styled as a button (#86): navigation stays an <a>, so semantics and middle-click work.
// Motion is opt-in via motion-safe: users with prefers-reduced-motion get color changes only.

const base =
  "inline-flex items-center gap-2 rounded-control font-medium " +
  "transition-[color,background-color,border-color,box-shadow,translate,scale] duration-150 ease-out " +
  "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const variants = {
  primary: "bg-primary text-primary-fg hover:shadow-glow",
  secondary: "border border-border bg-surface hover:border-primary hover:text-primary hover:shadow-glow",
  // primary/10 keeps primary text at >= 4.5:1 in light mode (15% would not).
  ghost: "hover:bg-primary/10 hover:text-primary",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  icon?: Social["icon"];
  // Extra screen-reader context, e.g. which project "Source code" belongs to.
  srLabel?: string;
  // Localized "(opens in a new tab)", read by screen readers on external links.
  newTabHint: string;
  rel?: string;
};

// Same look for a real <button> (e.g. the contact form's submit).
export const buttonClass = (variant: keyof typeof variants = "secondary", size: keyof typeof sizes = "md") =>
  `${base} ${variants[variant]} ${sizes[size]}`;

export function LinkButton({ href, children, variant = "secondary", size = "md", icon, srLabel, newTabHint, rel }: Props) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={buttonClass(variant, size)}
      {...(external && { target: "_blank", rel: ["noopener noreferrer", rel].filter(Boolean).join(" ") })}
    >
      {icon && <Icon name={icon} />}
      {children}
      {(srLabel || external) && (
        <span className="sr-only">
          {srLabel}
          {external && ` ${newTabHint}`}
        </span>
      )}
    </a>
  );
}
