"use client";

import Link from "next/link";

import { APP_NAME, BRAND_LINE } from "@/lib/config";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";

/** Landing page after Cognito's hosted-UI logout completes. */
export default function SignedOutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-display text-5xl text-brand">{APP_NAME}</h1>
          <DoubleRule width={92} />
          <p className="text-muted">{BRAND_LINE}</p>
        </header>

        <Card padding={28} className="w-full text-center">
          <div className="flex flex-col gap-4">
            <p className="font-display text-xl">You're signed out.</p>
            <p className="text-muted">
              Come back any time — your ratings are safe.
            </p>
            <Link href="/auth/signin">
              <EncoreButton kind="primary">Sign back in</EncoreButton>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
