import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Inner padding in px. Use 0 for full-bleed lists. */
  padding?: number;
  /** Use the slightly-lifted raised surface (hero now-playing card). */
  raised?: boolean;
}

/**
 * Raised surface — surface fill, 1px hairline border, 14px radius, a low
 * warm shadow. Cards lift, they don't float. Build spec 8.3.
 */
export function Card({
  children,
  padding = 24,
  raised = false,
  className = "",
  style,
  ...rest
}: CardProps) {
  return (
    <div
      className={`border border-hair rounded-card shadow-card ${
        raised ? "bg-raised" : "bg-surface"
      } ${className}`}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
