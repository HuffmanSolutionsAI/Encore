// Constant brand colors for JS-side use (gradients, SVG fills). Semantic
// (theme-flipping) colors live as CSS variables — use Tailwind classes for
// those. These are the literals that never change between light and dark.

export const BRAND = {
  ink: "#211B14",
  paper: "#F4EDDF",
  cocoa: "#3D2F22",
  cocoaDeep: "#241A12",
  brass: "#B98C3F",
  surface: "#FBF7EC",
  dust: "#DCCFB2",
  ember: "#8C6A47",
  clay: "#8C6A47",
} as const;

// Album-art gradient palettes (build-spec brand palette). A stable hash of
// the album id picks one, so the same record always renders the same art.
export const ART_PALETTES: ReadonlyArray<readonly [string, string]> = [
  [BRAND.cocoa, BRAND.brass],
  [BRAND.ember, BRAND.brass],
  [BRAND.ink, BRAND.ember],
  ["#5a3a2a", "#c8985a"],
  ["#3a2a3a", "#b98c3f"],
  ["#2a3a2a", "#8c6a47"],
];

/** Deterministic palette index from any string id. */
export function paletteFor(seed: string | number): readonly [string, string] {
  let n = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return ART_PALETTES[n % ART_PALETTES.length]!;
}
