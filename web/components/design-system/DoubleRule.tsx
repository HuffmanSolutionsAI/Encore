/**
 * Two thin brass lines — the brand's section divider. Build spec Section 8.3.
 */
export function DoubleRule({ width = 80 }: { width?: number }) {
  return (
    <div className="flex flex-col gap-1" style={{ width }} aria-hidden>
      <div className="h-px bg-encore-brass" />
      <div className="h-px bg-encore-brass" />
    </div>
  );
}
