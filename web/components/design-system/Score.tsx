/**
 * A score lockup — the brass Fraunces number Encore leads with. Renders an
 * em-dash when there's no score yet (an album nobody has rated).
 */
export function Score({ value, size = 36 }: { value: number | null; size?: number }) {
  // One decimal, matching the design — clean for half-step user scores and
  // tidy for arbitrary Bayesian aggregates alike.
  return (
    <span className="t-score" style={{ fontSize: size }}>
      {value == null ? "—" : value.toFixed(1)}
    </span>
  );
}
