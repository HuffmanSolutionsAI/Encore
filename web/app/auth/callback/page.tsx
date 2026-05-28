"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/config";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";

/**
 * Cognito callback handler. Cognito redirects back here with `?code=…&state=…`.
 * We hand the code to the session provider, which exchanges it for tokens,
 * loads the profile, and tells us where to go next.
 */
export default function CallbackPage() {
  const router = useRouter();
  const { hydrateAfterCallback } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const returnTo = await hydrateAfterCallback();
        if (!cancelled) router.replace(returnTo || "/");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't finish signing in.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAfterCallback, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-display text-5xl text-brand">{APP_NAME}</h1>
          <DoubleRule width={92} />
        </header>

        <Card padding={28} className="w-full text-center">
          {error ? (
            <div className="flex flex-col gap-4">
              <p className="font-display text-xl">Couldn't finish signing in.</p>
              <p className="text-muted">{error}</p>
              <EncoreButton kind="secondary" onClick={() => router.replace("/auth/signin")}>
                Try again
              </EncoreButton>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="font-display text-xl">Just a moment…</p>
              <p className="text-muted">Finishing your sign-in.</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
