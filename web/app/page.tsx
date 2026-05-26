"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { APP_NAME, BRAND_LINE } from "@/lib/config";
import { useSession } from "@/lib/auth/session";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { HandleForm } from "@/components/onboarding/HandleForm";
import { LastfmForm } from "@/components/onboarding/LastfmForm";
import { SpotifyExplainer } from "@/components/onboarding/SpotifyExplainer";
import { NowPlayingCard } from "@/components/now-playing/NowPlayingCard";
import { RateModal, type RatingSubject } from "@/components/rating/RateModal";
import type { NowPlayingTrack } from "@/lib/types";

/**
 * Top-level router. Mirrors `RootView` on the iOS side: based on the
 * SessionProvider's status, render a launch splash, redirect to sign-in,
 * walk the onboarding stages, or show the now-playing home.
 */
export default function HomePage() {
  const { status, signOut } = useSession();
  const router = useRouter();
  const [ratingSubject, setRatingSubject] = useState<RatingSubject | null>(null);

  useEffect(() => {
    if (status.kind === "signed_out") {
      router.replace("/auth/signin");
    }
  }, [status.kind, router]);

  function handleRate(track: NowPlayingTrack) {
    setRatingSubject({ kind: "now_playing", track });
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col items-center gap-8">
          <header className="flex flex-col items-center gap-3">
            <h1 className="font-display text-5xl text-encore-accent">{APP_NAME}</h1>
            <DoubleRule width={92} />
            <p className="text-encore-soft text-base">{BRAND_LINE}</p>
          </header>

          {renderBody()}

          {status.kind === "ready" && (
            <div className="flex items-center gap-4 text-xs">
              <a href="/library" className="text-encore-accent underline">
                Library
              </a>
              <span className="text-encore-faint">·</span>
              <button
                onClick={signOut}
                className="text-encore-faint underline"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </main>

      {ratingSubject && (
        <RateModal
          subject={ratingSubject}
          onClose={() => setRatingSubject(null)}
        />
      )}
    </>
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
        return <NowPlayingCard onRate={handleRate} />;
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
