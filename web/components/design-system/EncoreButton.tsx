import type { ButtonHTMLAttributes, ReactNode } from "react";

type Kind = "primary" | "secondary" | "brass";

interface EncoreButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  icon?: ReactNode;
}

/**
 * Brand button. Primary = Cocoa fill / Paper text. Secondary = Ink outline.
 * Brass = Brass fill, reserved for the rating CTA. Build spec Section 8.3.
 */
export function EncoreButton({
  kind = "primary",
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: EncoreButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-card font-semibold text-base transition active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed w-full";

  const variant =
    kind === "primary"
      ? "bg-encore-accent text-paper hover:bg-encore-accent-deep"
      : kind === "brass"
        ? "bg-encore-brass text-[#241A12] hover:opacity-90"
        : "bg-transparent border-2 border-current text-encore";

  return (
    <button
      className={`${base} ${variant} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
