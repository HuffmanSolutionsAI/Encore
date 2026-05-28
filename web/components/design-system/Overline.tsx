/** Tracked brass caps — the editorial label above section titles. */
export function Overline({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`t-overline ${className}`} style={style}>
      {children}
    </div>
  );
}
