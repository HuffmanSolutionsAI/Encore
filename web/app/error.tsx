"use client";

import { useEffect } from "react";

import { Wordmark } from "@/components/design-system/Wordmark";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";

/** App-wide error boundary (Next.js convention). Brand-voiced, with a retry
 *  and the reassurance that ratings are safe — the reliability promise. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // A hook point for real error reporting later.
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
        <header className="flex flex-col items-center gap-3">
          <Wordmark size={34} />
          <DoubleRule width={80} />
        </header>
        <Card padding={28} className="w-full">
          <p className="t-h3 mb-2">We&rsquo;ve lost the signal for a moment.</p>
          <p className="t-small mb-5">
            Something went wrong on our end. Your ratings are safe — try again shortly.
          </p>
          <div className="flex justify-center gap-2.5">
            <Button variant="primary" onClick={reset}>Try again</Button>
            <Button variant="ghost" onClick={() => (window.location.href = "/")}>Home</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
