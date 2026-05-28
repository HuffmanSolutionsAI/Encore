/**
 * The double rule — two thin brass lines. Encore's signature editorial
 * divider, sits under page titles and section headers. Build spec 8.3.
 */
export function DoubleRule({
  width = 64,
  ink = false,
  className = "",
  style,
}: {
  width?: number | string;
  ink?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`drule ${ink ? "drule-ink" : ""} ${className}`}
      style={{ width, ...style }}
    />
  );
}
