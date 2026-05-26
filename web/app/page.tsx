"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { APP_NAME, BRAND_LINE, RATING_PROMPT } from "@/lib/config";
import { useSession } from "@/lib/auth/session";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";
import { StarRating } from "@/components/design-system/StarRating";
import { HandleForm } from "@/components/onboarding/HandleForm";
import { LastfmForm } from "@/components/onboarding/LastfmForm";
import { SpotifyExplainer } from "@/components/onboarding/SpotifyExplainer";

/**
 * The top-level router. Mirrors `RootView` on the iOS side: based on the
 * SessionProvider's status, render a launch splash, redirect to sign-in,
 * walk the onboarding stages, or show the (placeholder for now) home.
 */
export default function HomePage() {
  const { status, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status.kind === "signed_out") {
      router.replace("/auth/signin");
    }
  }, [status.kind, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-display text-5xl text-encore-accent">{APP_NAME}</h1>
          <DoubleRule width={92} />
          <p className="text-encore-soft text-base">{BRAND_LINE}</p>
        </header>

        {renderBody()}
      </div>
    </main>
  );

  function renderBody() {
    switch (status.kind) {
      case "launching":
      case "signed_out":
        return (
          <Card padding="lg" className="w-full text-center">
            <p className="text-encore-soft">One moment…</p>
          </Card>
        );
      case "onboarding":
        return <OnboardingStage status={status} />;
      case "ready":
        return <ReadyPlaceholder onSignOut={signOut} />;
    }
  }
}

function OnboardingStage({
  status,
}: {
  status: Extract<ReturnType<typeof useSession>["status"], { kind: "onboarding" }>;
}) {
  switch (status.stage) {
    case "choose_handle":
      return <HandleForm />;
    case "link_lastfm":
      return <LastfmForm />;
    case "spotify_explainer":
      return <SpotifyExplainer />;
  }
}

function ReadyPlaceholder({ onSignOut }: { onSignOut: () => void }) {
  return (
    <>
      <Card padding="lg" className="w-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-display text-xl">Nothing playing yet.</p>
          <p className="text-encore-soft">
            Press play on Spotify and we'll catch the first note.
          </p>
          <StarRating score={4.5} size={28} />
        </div>
      </Card>

      <EncoreButton kind="brass" disabled>
        {RATING_PROMPT}
      </EncoreButton>

      <button
        onClick={onSignOut}
        className="text-encore-faint text-xs underline"
      >
        Sign out
      </button>

      <p className="text-encore-faint text-xs">Milestone 1 — onboarding (web)</p>
    </>
  );
}
