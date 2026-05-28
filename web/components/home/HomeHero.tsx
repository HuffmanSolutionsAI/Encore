"use client";

import { useSession } from "@/lib/auth/session";
import { useNowPlayingState } from "@/lib/now-playing/context";
import { useRate } from "@/components/rating/RateProvider";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Overline } from "@/components/design-system/Overline";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { AlbumArt } from "@/components/design-system/AlbumArt";

/**
 * Home hero — editorial welcome on the left, the live "Listening now" card
 * on the right. The card is driven by the shared now-playing poll.
 */
interface HomeHeroProps {
  recordCount: number;
  ovationCount: number;
}

export function HomeHero({ recordCount, ovationCount }: HomeHeroProps) {
  const { status } = useSession();
  const firstName =
    status.kind === "ready" ? status.profile.display_name.trim().split(/\s+/)[0] : "there";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-10 items-center">
      <div>
        <Overline>Welcome back, {firstName}</Overline>
        <h1 className="t-display mt-3.5">
          The records,
          <br />
          still playing.
        </h1>
        <div className="t-editorial mt-3.5" style={{ fontSize: 19, maxWidth: 420 }}>
          {recordCount === 0 ? (
            <>Rate the last song that stopped you in your tracks — your library starts there.</>
          ) : (
            <>
              You&rsquo;ve rated{" "}
              <b className="not-italic text-fg">{recordCount}</b>{" "}
              {recordCount === 1 ? "record" : "records"}
              {ovationCount > 0 && (
                <>
                  . {ovationCount} of them earned a standing ovation
                </>
              )}
              .
            </>
          )}
        </div>
        <DoubleRule width={56} className="mt-6" />
      </div>

      <ListeningNowCard />
    </div>
  );
}

function ListeningNowCard() {
  const { state, refresh } = useNowPlayingState();
  const { openRate } = useRate();

  return (
    <Card raised padding={24}>
      <Overline>Listening now</Overline>

      {state.kind === "playing" && state.track ? (
        <div className="flex gap-[18px] mt-3.5">
          <AlbumArt url={state.track.artworkURL} seed={state.track.title} label={state.track.title[0]} size={120} radius={10} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-fg leading-snug" style={{ fontWeight: 600, fontSize: 22, letterSpacing: "-0.005em" }}>
              {state.track.title}
            </div>
            {state.track.album && <div className="t-editorial mt-1" style={{ fontSize: 15 }}>{state.track.album}</div>}
            <div className="t-caption mt-0.5">{state.track.artist}</div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => openRate({ kind: "now_playing", track: state.track! })}>
                Worth an encore?
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-col gap-3 py-2">
          <div className="t-body text-muted">
            {state.kind === "loading" && "Listening for what's on…"}
            {state.kind === "empty" && "Nothing playing right now. Press play on Spotify and we'll catch the first note."}
            {state.kind === "lastfm_not_linked" && "Last.fm isn't linked yet — add your username so Encore can hear what you're playing."}
            {state.kind === "error" && "We've lost the signal for a moment. Your ratings are safe."}
          </div>
          {state.kind === "error" && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => void refresh()}>Try again</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
