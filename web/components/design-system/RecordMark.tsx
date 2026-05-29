import { BRAND } from "./tokens";

/**
 * The record medallion — a vinyl disc: ink body, two faint dust grooves,
 * a brass label, an ink spindle. The seal's centerpiece. Build spec brand.
 */
export function RecordMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="56" fill={BRAND.ink} />
      <circle cx="60" cy="60" r="45" fill="none" stroke={BRAND.dust} strokeWidth="1.4" opacity="0.5" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={BRAND.dust} strokeWidth="1.4" opacity="0.5" />
      <circle cx="60" cy="60" r="19" fill={BRAND.brass} />
      <circle cx="60" cy="60" r="4.5" fill={BRAND.ink} />
    </svg>
  );
}
