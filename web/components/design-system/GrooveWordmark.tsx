"use client";

import { useId } from "react";
import { BRAND } from "./tokens";

/**
 * The "groove backdrop" brand lockup — the wordmark "Encore" with concentric
 * record grooves rippling out from a small record hub set just past the final
 * "e", masked to dissolve before they reach the nav. The sidebar brand slot.
 *
 * Config values are baked from the design's tuned defaults (hub brass, groove
 * spacing 0.64, opacity 0.28). `color` follows the theme so the grooves and
 * the word stay in the foreground ink/paper — brass shows only at the hub.
 */
export function GrooveWordmark({
  fontSize = 23,
  color = "var(--e-fg)",
  grooveGap = 0.64,
  grooveOpacity = 0.28,
}: {
  fontSize?: number;
  color?: string;
  grooveGap?: number;
  grooveOpacity?: number;
}) {
  const id = useId().replace(/:/g, "");
  const F = fontSize;
  const wordW = F * 3.02; // optical width of "Encore" at 600 / -0.02em
  const hubR = F * 0.56;
  const spindleR = F * 0.1;
  const H = F * 2.35;
  const cy = H / 2;
  const cx = wordW + hubR + F * 0.5; // medallion sits a little past the word
  const W = cx + hubR + F * 0.3;
  const sw = Math.max(0.9, F * 0.045);

  const grooves: number[] = [];
  for (let r = hubR + F * grooveGap; r < W * 1.02; r += F * grooveGap) grooves.push(r);

  return (
    <div style={{ position: "relative", width: W, height: H, flex: "none" }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <radialGradient id={`${id}fade`} cx={`${(cx / W) * 100}%`} cy="50%" r="64%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="68%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${id}mask`}>
            <rect x="0" y="0" width={W} height={H} fill={`url(#${id}fade)`} />
          </mask>
        </defs>
        <g mask={`url(#${id}mask)`}>
          {grooves.map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} opacity={grooveOpacity} />
          ))}
        </g>
        {/* the record hub: a brass disc with a dark spindle */}
        <circle cx={cx} cy={cy} r={hubR} fill={BRAND.brass} />
        <circle cx={cx} cy={cy} r={spindleR * 1.15} fill={BRAND.ink} />
      </svg>
      <span
        className="font-display"
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          fontWeight: 600,
          fontSize: F,
          letterSpacing: "-0.02em",
          color,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        Encore
      </span>
    </div>
  );
}
