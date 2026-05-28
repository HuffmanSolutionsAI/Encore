"use client";

/** Filter / tag pill. `active` flips to the solid (Ink-on-paper) treatment. */
export function Pill({
  children,
  active = false,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    "inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-[7px] text-[12.5px] font-semibold transition";
  const look = active
    ? "bg-fg text-page border border-transparent"
    : "bg-transparent text-fg border border-hair hover:border-brand";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`${base} ${look} ${onClick ? "cursor-pointer" : "cursor-default"} ${className}`}
    >
      {children}
    </button>
  );
}
