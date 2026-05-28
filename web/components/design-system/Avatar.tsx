import { BRAND } from "./tokens";

/** Initial avatar — brand-fill circle, Fraunces letter. */
export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const letter = name?.trim()?.[0]?.toUpperCase() ?? "·";
  return (
    <div
      className="font-display flex items-center justify-center flex-none"
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: "var(--e-brand)",
        color: BRAND.paper,
        fontWeight: 600,
        fontSize: size * 0.42,
        lineHeight: 1,
      }}
    >
      {letter}
    </div>
  );
}
