import { Overline } from "@/components/design-system/Overline";
import { DoubleRule } from "@/components/design-system/DoubleRule";

/** Editorial page header: overline · Fraunces title · italic subtitle · rule. */
export function PageHeader({
  overline,
  title,
  subtitle,
  right,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          {overline && <Overline>{overline}</Overline>}
          <h1 className="t-h1 mt-2">{title}</h1>
          {subtitle && (
            <div className="t-editorial mt-2" style={{ fontSize: 17, maxWidth: 520 }}>
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
      <DoubleRule width={56} className="mt-[22px]" />
    </div>
  );
}

/** Section header used between content blocks. */
export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-6 ${className}`}>
      <div>
        <h2 className="t-h2">{title}</h2>
        {subtitle && <div className="t-editorial mt-1.5" style={{ fontSize: 15 }}>{subtitle}</div>}
        <DoubleRule width={36} className="mt-3" />
      </div>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-[13.5px] font-semibold text-brand"
          style={{ letterSpacing: "-0.005em" }}
        >
          {action} <span aria-hidden>→</span>
        </button>
      )}
    </div>
  );
}
