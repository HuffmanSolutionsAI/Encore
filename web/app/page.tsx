"use client";

import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { AppShell } from "@/components/layout/AppShell";
import { HomeHero } from "@/components/home/HomeHero";
import { RecentlyRated } from "@/components/now-playing/RecentlyRated";
import { Wordmark } from "@/components/design-system/Wordmark";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { HandleForm } from "@/components/onboarding/HandleForm";
import { LastfmForm } from "@/components/onboarding/LastfmForm";
import { SpotifyExplainer } from "@/components/onboarding/SpotifyExplainer";

export default function HomePage() {
  const { status } = useSession();

  return (
    <AppShell>
      {status.kind === "ready" ? (
        <HomeContent />
      ) : status.kind === "onboarding" ? (
        <OnboardingFrame stage={status.stage} />
      ) : (
        <div className="pt-16 text-center t-small">One moment…</div>
      )}
    </AppShell>
  );
}

function HomeContent() {
  const { ratings } = useSession();
  const router = useRouter();
  const { state } = useLibrary(ratings);

  const entries = state.kind === "loaded" ? state.entries : [];
  const recordCount = entries.length;
  const ovationCount = entries.filter((e) => e.score === 5).length;

  return (
    <>
      <HomeHero recordCount={recordCount} ovationCount={ovationCount} />
      <RecentlyRated entries={entries} onOpenLibrary={() => router.push("/library")} />
    </>
  );
}

function OnboardingFrame({ stage }: { stage: "choose_handle" | "link_lastfm" | "spotify_explainer" }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <Wordmark size={34} />
        <DoubleRule width={60} className="mt-1" />
      </header>
      <div className="w-full max-w-md">
        {stage === "choose_handle" && <HandleForm />}
        {stage === "link_lastfm" && <LastfmForm />}
        {stage === "spotify_explainer" && <SpotifyExplainer />}
      </div>
    </div>
  );
}
