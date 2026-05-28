import { BRAND, paletteFor } from "./tokens";

/**
 * Album cover. Shows real artwork when a URL is present; otherwise a
 * deterministic brand-palette gradient placeholder with an optional
 * Fraunces initial — matches the design handoff's `AlbumArt`.
 */
export function AlbumArt({
  url,
  seed = 0,
  label,
  size = 64,
  radius = 8,
  className = "",
  style,
}: {
  url?: string | null;
  seed?: string | number;
  label?: string | null;
  size?: number | string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [a, b] = paletteFor(seed);
  const labelSize = typeof size === "number" ? size * 0.4 : 56;

  return (
    <div
      className={`relative overflow-hidden flex-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        ...style,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        label && (
          <div
            className="absolute inset-0 flex items-center justify-center font-display"
            style={{
              fontWeight: 600,
              fontSize: labelSize,
              color: "rgba(244,237,223,0.42)",
              letterSpacing: "-0.04em",
            }}
          >
            {label}
          </div>
        )
      )}
    </div>
  );
}

export const PLACEHOLDER_FG = BRAND.paper;
