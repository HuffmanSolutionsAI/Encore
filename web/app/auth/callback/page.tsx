"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { Button } from "@/components/design-system/Button";
import { Overline } from "@/components/design-system/Overline";
import { AuthFrame } from "@/components/layout/AuthFrame";

/**
 * Cognito callback. Hands the `?code=…&state=…` to the session provider,
 * which exchanges it for tokens, loads the profile, and tells us where to go.
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
          setError(err instanceof Error ? err.message : "Couldn't finish signing in.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAfterCallback, router]);

  return (
    <AuthFrame>
      {error ? (
        <>
          <Overline>Sign-in didn&rsquo;t finish</Overline>
          <h1 className="t-h1 mt-3">Something interrupted us.</h1>
          <p className="t-editorial mt-3" style={{ fontSize: 17 }}>
            {error}
          </p>
          <div className="mt-8">
            <Button variant="primary" size="lg" className="w-full" onClick={() => router.replace("/auth/signin")}>
              Try again
            </Button>
          </div>
        </>
      ) : (
        <>
          <Overline>Just a moment</Overline>
          <h1 className="t-h1 mt-3">Finishing your sign-in.</h1>
          <p className="t-editorial mt-3" style={{ fontSize: 17 }}>
            Pulling your library back from the shelf.
          </p>
        </>
      )}
    </AuthFrame>
  );
}
