import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "brass" | "pale" | "text";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
}

const SIZES: Record<ButtonSize, string> = {
  sm: "text-[13px] px-3.5 py-2",
  md: "text-sm px-5 py-[11px]",
  lg: "text-[15px] px-6 py-3.5",
};

// Brass is reserved for the rating CTA. Primary actions everywhere else are
// Cocoa (the `brand` token). Ghost = Ink outline. Pale = surface chip.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-paper hover:bg-brand-hover border border-transparent",
  brass: "bg-brass text-ink hover:opacity-90 border border-transparent",
  ghost: "bg-transparent text-fg border border-current hover:bg-surface",
  pale: "bg-surface text-fg border border-hair hover:border-brand",
  text: "bg-transparent text-brand border-none px-2 hover:opacity-80",
};

/**
 * Brand button. Pill radius, Inter SemiBold, gentle press scale.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap font-sans
        transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
        ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
