import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
}

const padMap = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

/**
 * Raised surface — Surface fill, 1px Dust border, 13pt corner radius.
 * Build spec Section 8.3.
 */
export function Card({ children, padding = "md", className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-encore-surface border border-encore-hairline rounded-card ${padMap[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
