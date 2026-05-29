"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { isRemoteConfigured } from "@/lib/config";
import { Button } from "@/components/design-system/Button";
import { Overline } from "@/components/design-system/Overline";
import { SealLockup } from "@/components/design-system/SealLockup";
import { Wordmark } from "@/components/design-system/Wordmark";
import { BRAND } from "@/components/design-system/tokens";

export default function SignInPage() {
  const { signIn, status, devMode } = useSession();
  const router = useRouter();
  const configured = isRemoteConfigured();
  const errorMessage = status.kind === "signed_out" ? status.error : undefined;

  useEffect(() => {
    if (status.kind === "ready" || status.kind === "onboarding") {
      router.replace("/");
    }
  }, [status.kind, router]);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-page">
      {/* Left — the seal, on the ink panel */}
      <SealPanel />

      {/* Right — the form */}
      <div className="flex flex-col px-8 sm:px-[60px] py-10 sm:py-14">
        {/* Brand for mobile, where the ink panel is hidden */}
        <div className="md:hidden flex justify-center mb-8">
          <Wordmark size={30} color="var(--e-brand)" />
        </div>

        <div className="flex-1 flex flex-col justify-center w-full max-w-[420px] mx-auto">
          <Overline>Welcome back</Overline>
          <h1 className="t-h1 mt-3">Pick up where you left off.</h1>
          <p className="t-editorial mt-3" style={{ fontSize: 17 }}>
            Your encores have been kept safe.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {devMode ? (
              <Button variant="primary" size="lg" className="w-full" onClick={() => void signIn()} disabled={!configured}>
                Sign in as dev
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={<AppleGlyph />}
                onClick={() => void signIn()}
                disabled={!configured}
              >
                Continue with Apple
              </Button>
            )}
            {errorMessage && <p className="t-small text-center">{errorMessage}</p>}
          </div>

          {!configured && (
            <div className="mt-6 border border-hair rounded-card bg-surface p-4 text-sm text-muted space-y-2">
              <p className="font-semibold text-fg">Not configured yet.</p>
              {devMode ? (
                <p>
                  Dev mode needs <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code> in{" "}
                  <code className="font-mono">web/.env.local</code> — default{" "}
                  <code className="font-mono">http://localhost:3001</code> when the API runs locally.
                </p>
              ) : (
                <p>
                  Set <code className="font-mono">NEXT_PUBLIC_*</code> values in{" "}
                  <code className="font-mono">web/.env.local</code> from{" "}
                  <code className="font-mono">terraform output</code> to enable sign-in.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="t-caption text-center">
          By continuing you agree to Encore&rsquo;s Terms and Privacy.
        </p>
      </div>
    </div>
  );
}

function SealPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-between relative overflow-hidden px-[60px] py-14"
      style={{ background: BRAND.ink, color: BRAND.paper }}
    >
      <div className="relative z-[2]">
        <span className="t-overline">Volume One</span>
      </div>

      <div className="relative z-[2] flex-1 flex items-center justify-center">
        <SealLockup recordSize={132} wordSize={52} />
      </div>

      {/* Faint groove field bleeding off the lower edge */}
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

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        d="M16.365 12.84c-.027-2.79 2.286-4.122 2.39-4.187-1.301-1.903-3.327-2.165-4.041-2.194-1.718-.174-3.354 1.012-4.226 1.012-.872 0-2.213-.988-3.638-.96-1.871.027-3.595 1.087-4.557 2.764-1.943 3.366-.497 8.349 1.394 11.08.927 1.336 2.03 2.834 3.473 2.78 1.394-.057 1.92-.901 3.607-.901 1.685 0 2.16.901 3.638.872 1.503-.024 2.456-1.36 3.376-2.703 1.06-1.546 1.5-3.045 1.527-3.122-.033-.014-2.93-1.125-2.943-4.441zM13.674 4.97c.77-.929 1.288-2.222 1.147-3.51-1.108.045-2.448.738-3.241 1.668-.712.819-1.336 2.137-1.169 3.402 1.232.095 2.49-.626 3.263-1.56z"
        fill="currentColor"
      />
    </svg>
  );
}
