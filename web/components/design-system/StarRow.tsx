"use client";

import { useId } from "react";
import { BRAND } from "./tokens";

/**
 * Read-only star row with half-star support (gradient split). Brass when
 * filled, theme dust when empty. For the interactive rate control, use
 * StarRating.
 */
export function StarRow({
  value,
  max = 5,
  size = 16,
}: {
  value: number | null;
  max?: number;
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  const v = value ?? 0;
  const path =
    "M12 17.3l-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03z";

  return (
    <div className="inline-flex" style={{ gap: 2 }} aria-label={value == null ? "Not rated" : `${v} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(v);
        const half = !filled && i < v;
        if (half) {
          const hid = `${id}-${i}`;
          return (
            <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
              <defs>
                <linearGradient id={hid}>
                  <stop offset="50%" stopColor={BRAND.brass} />
                  <stop offset="50%" stopColor="var(--e-star-empty)" />
                </linearGradient>
              </defs>
              <path d={path} fill={`url(#${hid})`} />
            </svg>
          );
        }
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <path d={path} fill={filled ? BRAND.brass : "var(--e-star-empty)"} />
          </svg>
        );
      })}
    </div>
  );
}
