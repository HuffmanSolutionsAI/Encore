"use client";

import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/session";
import { useRate } from "@/components/rating/RateProvider";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { SectionHeader } from "@/components/layout/PageHeader";
import { StarRow } from "@/components/design-system/StarRow";
import type { HistoryItem } from "@/lib/types";

/**
 * Recently played strip — pulls the user's scrobble history. Empty until
 * they hit "Sync from Last.fm" once (or until a play arrives via
 * /now-playing). Each row offers a "Rate" affordance if it's unrated.
 */
export function RecentlyPlayed() {
  const { history } = useSession();
  const { openRate } = useRate();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "loaded"; items: HistoryItem[] }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function load() {
    try {
      const items = await history.list(8);
      setState({ kind: "loaded", items });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Couldn't load history." });
    }
  }

  useEffect(() => {
    void load();
    const onRated = () => void load();
    window.addEventListener("encore:rated", onRated);
    return () => window.removeEventListener("encore:rated", onRated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sync() {
    setSyncing(true);
    setSyncNote(null);
    try {
      const res = await history.sync();
      setSyncNote(res.inserted === 0 ? "Already up to date." : `Pulled ${res.inserted} scrobbles.`);
      await load();
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  // Hide entirely when we genuinely have nothing — keeps the home page clean
  // for users who haven't linked Last.fm yet.
  if (state.kind === "loaded" && state.items.length === 0) return null;
  if (state.kind === "error") return null;

  return (
    <section className="mt-12">
      <SectionHeader
        title="Recently played"
        subtitle="Plays from your Last.fm history — rate any you haven't yet."
        action={syncing ? "Syncing…" : "Sync from Last.fm"}
        onAction={syncing ? undefined : sync}
      />
      {syncNote && <p className="t-caption mt-2">{syncNote}</p>}
      <Card padding={0} className="mt-5 overflow-hidden">
        {state.kind === "loading" && <p className="t-small px-5 py-4">Loading…</p>}
        {state.kind === "loaded" &&
          state.items.map((item, i) => <Row key={`${item.played_at}-${i}`} item={item} first={i === 0} onRate={openRate} />)}
      </Card>
    </section>
  );
}

function Row({ item, first, onRate }: { item: HistoryItem; first: boolean; onRate: ReturnType<typeof useRate>["openRate"] }) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 ${first ? "" : "border-t border-hair"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-fg truncate" style={{ fontSize: 15, letterSpacing: "-0.005em" }}>{item.track_title}</div>
        <div className="t-caption truncate">{item.artist_name} · {relative(item.played_at)}</div>
      </div>
      {item.rated ? (
        <StarRow value={item.score} size={13} />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onRate({
              kind: "now_playing",
              track: {
                title: item.track_title,
                artist: item.artist_name,
                album: null,
                artworkURL: null,
                trackMBID: item.track_mbid,
                lastfmURL: null,
              },
            })
          }
        >
          Rate
        </Button>
      )}
    </div>
  );
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
