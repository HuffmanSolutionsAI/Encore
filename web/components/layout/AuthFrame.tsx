"use client";

import { SealLockup } from "@/components/design-system/SealLockup";
import { Wordmark } from "@/components/design-system/Wordmark";
import { Overline } from "@/components/design-system/Overline";
import { BRAND } from "@/components/design-system/tokens";

/**
 * Split brand frame for the auth surfaces — Ink panel with the seal on the
 * left, content (form, message, progress) on the right. Mobile collapses
 * to a single column with a compact wordmark.
 */
export function AuthFrame({
  overline = "Volume One",
  children,
  footer,
}: {
  overline?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-page">
      <SealPanel overline={overline} />
      <div className="flex flex-col px-8 sm:px-[60px] py-10 sm:py-14">
        <div className="md:hidden flex justify-center mb-8">
          <Wordmark size={30} color="var(--e-brand)" />
        </div>
        <div className="flex-1 flex flex-col justify-center w-full max-w-[420px] mx-auto">
          {children}
        </div>
        {footer && <p className="t-caption text-center">{footer}</p>}
      </div>
    </div>
  );
}

function SealPanel({ overline }: { overline: string }) {
  return (
    <div
      className="hidden md:flex flex-col justify-between relative overflow-hidden px-[60px] py-14"
      style={{ background: BRAND.ink, color: BRAND.paper }}
    >
      <div className="relative z-[2]">
        <Overline>{overline}</Overline>
      </div>
      <div className="relative z-[2] flex-1 flex items-center justify-center">
        <SealLockup recordSize={132} wordSize={52} />
      </div>
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ bottom: -260, opacity: 0.08 }}
      >
        <svg width="620" height="620" viewBox="0 0 560 560">
          {[278, 216, 154, 92].map((r) => (
            <circle key={r} cx="280" cy="280" r={r} fill="none" stroke={BRAND.paper} strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    </div>
  );
}
