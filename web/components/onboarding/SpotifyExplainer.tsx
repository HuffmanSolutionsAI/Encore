"use client";

import { useSession } from "@/lib/auth/session";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";

const SPOTIFY_SETTING_URL =
  "https://www.spotify.com/account/apps/";

/**
 * Explains the one-time Spotify→Last.fm setting the user has to flip
 * so their plays start scrobbling. Build spec F1.
 */
export function SpotifyExplainer() {
  const { completeSpotifyStep } = useSession();

  return (
    <Card padding="lg" className="w-full">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-2xl">Connect Spotify.</h2>
          <DoubleRule width={48} />
          <p className="text-encore-soft text-sm">
            One-time setup, inside Spotify itself.
          </p>
        </header>

        <ol className="flex flex-col gap-3 text-sm text-encore-soft">
          <Step n={1}>
            Open <strong className="text-encore">Spotify → Settings → Apps</strong>{" "}
            (or use the link below).
          </Step>
          <Step n={2}>
            Find <strong className="text-encore">Last.fm</strong> in the list and
            toggle it on. Sign in to Last.fm if asked.
          </Step>
          <Step n={3}>
            That's it. From now on, every track you play on Spotify shows up
            in Encore within ~30 seconds.
          </Step>
        </ol>

        <a
          href={SPOTIFY_SETTING_URL}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          <EncoreButton kind="secondary">Open Spotify settings</EncoreButton>
        </a>

        <EncoreButton kind="primary" onClick={completeSpotifyStep}>
          I'm in
        </EncoreButton>

        <p className="text-encore-faint text-xs text-center">
          Other listening apps (Apple Music, Tidal, Deezer, YouTube) work too —
          if they scrobble to Last.fm, Encore picks them up.
        </p>
      </div>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-encore-brass text-[#241A12] text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
