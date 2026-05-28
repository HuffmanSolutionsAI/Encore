"use client";

import { useId } from "react";

interface StarRatingProps {
  /** Score in 0.5 steps within 0..5. `null` renders all stars empty. */
  score: number | null;
  size?: number;
  /** When set, the control becomes interactive and reports new scores (0.5..5.0). */
  onChange?: (next: number) => void;
}

const STAR_COUNT = 5;

/**
 * Five-star rating with half-star support. Read-only by default; pass
 * `onChange` to make it interactive. Build spec Section 8.3.
 */
export function StarRating({ score, size = 24, onChange }: StarRatingProps) {
  const labelId = useId();
  const interactive = Boolean(onChange);

  return (
    <div
      role="img"
      aria-labelledby={labelId}
      className="inline-flex items-center"
      style={{ gap: size * 0.18 }}
    >
      <span id={labelId} className="sr-only">
        {score == null ? "Not rated" : `${score} of 5 stars`}
      </span>
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <Star
          key={i}
          index={i}
          score={score ?? 0}
          size={size}
          onChange={onChange}
          interactive={interactive}
        />
      ))}
    </div>
  );
}

function Star({
  index,
  score,
  size,
  onChange,
  interactive,
}: {
  index: number;
  score: number;
  size: number;
  onChange: ((next: number) => void) | undefined;
  interactive: boolean;
}) {
  const fill = Math.min(Math.max(score - index, 0), 1);

  function handleClick(event: React.MouseEvent<HTMLSpanElement>) {
    if (!onChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const isHalf = event.clientX - rect.left < rect.width / 2;
    onChange(index + (isHalf ? 0.5 : 1));
  }

  return (
    <span
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!onChange) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(index + 1);
        }
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? `Rate ${index + 1} stars` : undefined}
      className={`relative inline-block ${interactive ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:rounded" : ""}`}
      style={{ width: size, height: size }}
    >
      {/* Empty star (theme dust) sits underneath. */}
      <StarGlyph size={size} className="absolute inset-0" color="var(--e-star-empty)" />
      {/* Filled star (Brass) clipped to `fill` of the width. */}
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fill * 100}%` }}
      >
        <StarGlyph size={size} color="#B98C3F" />
      </span>
    </span>
  );
}

function StarGlyph({
  size,
  color,
  className = "",
}: {
  size: number;
  color: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <path
        d="M12 2.5l2.928 6.193 6.822.92-4.987 4.65 1.232 6.737L12 17.77l-5.995 3.23 1.232-6.737L2.25 9.613l6.822-.92L12 2.5z"
        fill={color}
      />
    </svg>
  );
}
