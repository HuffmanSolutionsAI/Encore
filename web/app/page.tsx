"use client";

import { useState } from "react";

import { BRAND_LINE } from "@/lib/config";
import { useSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { HandleForm } from "@/components/onboarding/HandleForm";
import { LastfmForm } from "@/components/onboarding/LastfmForm";
import { SpotifyExplainer } from "@/components/onboarding/SpotifyExplainer";
import { NowPlayingCard } from "@/components/now-playing/NowPlayingCard";
import { RecentlyRated } from "@/components/now-playing/RecentlyRated";
import { RateModal, type RatingSubject } from "@/components/rating/RateModal";
import type { NowPlayingTrack } from "@/lib/types";

export default function HomePage() {
  const { status } = useSession();
  const [ratingSubject, setRatingSubject] = useState<RatingSubject | null>(null);
  const [recentReloadKey, setRecentReloadKey] = useState(0);

  function handleRate(track: NowPlayingTrack) {
    setRatingSubject({ kind: "now_playing", track });
  }

  function handleSaved() {
    // Bump the key so RecentlyRated re-fetches.
    setRecentReloadKey((k) => k + 1);
  }

  return (
    <>
      <AppShell maxWidth="narrow">
        {renderBody()}
      </AppShell>

      {ratingSubject && (
        <RateModal
          subject={ratingSubject}
          onClose={() => setRatingSubject(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );

  function renderBody() {
    switch (status.kind) {
      case "launching":
      case "signed_out":
        return <Placeholder />;
      case "onboarding":
        return <OnboardingStage status={status} />;
      case "ready":
        return (
          <div className="flex flex-col gap-8">
            <NowPlayingCard onRate={handleRate} />
            <RecentlyRated key={recentReloadKey} />
          </div>
        );
    }
  }
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center gap-3 pt-16">
      <p className="text-encore-soft">One moment…</p>
    </div>
  );
}

function OnboardingStage({
  status,
}: {
  status: Extract<ReturnType<typeof useSession>["status"], { kind: "onboarding" }>;
}) {
  return (
    <div className="flex flex-col gap-6 items-center">
      <header className="flex flex-col items-center gap-2 text-center pt-4">
        <p className="text-encore-soft text-sm">{BRAND_LINE}</p>
        <DoubleRule width={60} />
      </header>
      <div className="w-full max-w-md">
        {(() => {
          switch (status.stage) {
            case "choose_handle":
              return <HandleForm />;
            case "link_lastfm":
              return <LastfmForm />;
            case "spotify_explainer":
              return <SpotifyExplainer />;
          }
        })()}
      </div>
    </div>
  );
}
