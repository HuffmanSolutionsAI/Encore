"use client";

import { useSession } from "@/lib/auth/session";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { RATING_PROMPT } from "@/lib/config";
import { Card } from "@/components/design-system/Card";
import { EncoreButton } from "@/components/design-system/EncoreButton";
import type { NowPlayingTrack } from "@/lib/types";

interface NowPlayingCardProps {
  onRate: (track: NowPlayingTrack) => void;
}

/** The signed-in home content. Renders the live now-playing card or the
 * appropriate empty/error state, polled by `useNowPlaying`. */
export function NowPlayingCard({ onRate }: NowPlayingCardProps) {
  const { nowPlaying } = useSession();
  const { state, refresh } = useNowPlaying(nowPlaying);

  switch (state.kind) {
    case "loading":
      return (
        <Card padding="lg" className="w-full text-center">
          <p className="text-encore-soft">Listening for what's on…</p>
        </Card>
      );
    case "playing":
      return (
        <Card padding="lg" className="w-full">
          <div className="flex flex-col items-center gap-5 text-center">
            <Artwork url={state.track!.artworkURL} />
            <div className="flex flex-col gap-1">
              <p className="font-display text-xl">{state.track!.title}</p>
              <p className="text-encore-soft">{state.track!.artist}</p>
              {state.track!.album && (
                <p className="text-encore-faint text-sm">{state.track!.album}</p>
              )}
            </div>
            <EncoreButton kind="brass" icon={<StarGlyph />} onClick={() => onRate(state.track!)}>
              {RATING_PROMPT}
            </EncoreButton>
          </div>
        </Card>
      );
    case "empty":
      return (
        <Card padding="lg" className="w-full text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="font-display text-xl">Nothing's playing.</p>
            <p className="text-encore-soft">
              Press play on Spotify and we'll catch the first note.
            </p>
          </div>
        </Card>
      );
    case "lastfm_not_linked":
      return (
        <Card padding="lg" className="w-full text-center">
          <div className="flex flex-col gap-3">
            <p className="font-display text-xl">Last.fm isn't linked.</p>
            <p className="text-encore-soft">
              Add your Last.fm username from settings so Encore can hear what you're playing.
            </p>
          </div>
        </Card>
      );
    case "error":
      return (
        <Card padding="lg" className="w-full text-center">
          <div className="flex flex-col gap-3">
            <p className="font-display text-xl">We've lost the signal.</p>
            <p className="text-encore-soft">{state.error}</p>
            <EncoreButton kind="secondary" onClick={() => void refresh()}>
              Try again
            </EncoreButton>
          </div>
        </Card>
      );
  }
}

function Artwork({ url }: { url: string | null }) {
  return (
    <div
      className="w-52 h-52 rounded-xl overflow-hidden border border-encore-hairline flex items-center justify-center bg-encore-surface"
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-encore-faint">
          <MusicGlyph size={48} />
        </span>
      )}
    </div>
  );
}

function MusicGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 3v10.5a3.5 3.5 0 11-2-3.163V3h2zm6 0v8.5a3.5 3.5 0 11-2-3.163V3h2z"
        fill="currentColor"
      />
    </svg>
  );
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        d="M12 2.5l2.928 6.193 6.822.92-4.987 4.65 1.232 6.737L12 17.77l-5.995 3.23 1.232-6.737L2.25 9.613l6.822-.92L12 2.5z"
        fill="currentColor"
      />
    </svg>
  );
}
