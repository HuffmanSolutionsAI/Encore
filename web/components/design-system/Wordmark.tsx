import { BRAND } from "./tokens";

/** The Encore wordmark — Fraunces SemiBold, tightly tracked. */
export function Wordmark({ size = 22, color }: { size?: number; color?: string }) {
  return (
    <span
      className="font-display"
      style={{
        fontWeight: 600,
        fontSize: size,
        color: color ?? "var(--e-fg)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      Encore
    </span>
  );
}

/** The square monogram — the app-icon "E". Cocoa tile, paper letter. */
export function MonogramE({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center flex-none"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: "var(--e-brand)",
      }}
    >
      <span
        className="font-display"
        style={{
          fontWeight: 600,
          fontSize: size * 0.66,
          color: BRAND.paper,
          lineHeight: 1,
          transform: "translateY(-2%)",
        }}
      >
        E
      </span>
    </div>
  );
}
