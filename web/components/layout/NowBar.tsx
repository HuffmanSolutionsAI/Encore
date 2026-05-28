"use client";

import { useNowPlayingState } from "@/lib/now-playing/context";
import { useRate } from "@/components/rating/RateProvider";
import { Button } from "@/components/design-system/Button";
import { Overline } from "@/components/design-system/Overline";
import { StarRow } from "@/components/design-system/StarRow";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { Icon } from "@/components/design-system/Icon";

/**
 * Persistent Now-playing bar — paper-tinted glass at the bottom of the shell.
 * Shows the live track from `/now-playing` and a one-tap "Worth an encore?".
 *
 * No transport controls by design: Encore reads what's playing (via Last.fm),
 * it never controls playback — fake transport would be dishonest.
 */
export function NowBar() {
  const { state, refresh } = useNowPlayingState();
  const { openRate } = useRate();

  // Stay out of the way until there's something to act on.
  if (state.kind === "loading" || state.kind === "lastfm_not_linked") return null;

  return (
    <div
      className="sticky bottom-0 z-[6] border-t border-hair flex items-center gap-[18px] px-[26px] py-3"
      style={{ background: "color-mix(in srgb, var(--e-bg) 92%, transparent)", backdropFilter: "blur(12px)" }}
    >
      <Overline className="flex-none w-[92px]">Now playing</Overline>

      {state.kind === "playing" && state.track ? (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AlbumArt url={state.track.artworkURL} seed={state.track.title} size={42} radius={6} />
            <div className="min-w-0">
              <div className="font-display text-fg leading-tight truncate" style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.005em" }}>
                {state.track.title}
              </div>
              <div className="t-caption truncate mt-0.5">
                {state.track.album ? `${state.track.album} · ${state.track.artist}` : state.track.artist}
              </div>
            </div>
          </div>
          <div className="flex-none flex items-center gap-3">
            <span className="hidden sm:block"><StarRow value={0} size={18} /></span>
            <Button
              variant="primary"
              size="sm"
              icon={<Icon.Music size={15} />}
              onClick={() => openRate({ kind: "now_playing", track: state.track! })}
            >
              Worth an encore?
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="t-caption">
            {state.kind === "error"
              ? "We've lost the signal for a moment — your ratings are safe."
              : "Nothing playing right now. Press play on Spotify."}
          </span>
          {state.kind === "error" && (
            <button onClick={() => void refresh()} className="t-caption underline text-brand">
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
