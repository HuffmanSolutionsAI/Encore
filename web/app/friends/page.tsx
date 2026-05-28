"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth/session";
import { useFeed } from "@/lib/hooks/useFeed";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Avatar } from "@/components/design-system/Avatar";
import { Score } from "@/components/design-system/Score";
import { StarRow } from "@/components/design-system/StarRow";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { Icon } from "@/components/design-system/Icon";
import { FollowButton } from "@/components/social/FollowButton";
import type { FeedItem, UserSearchResult } from "@/lib/types";

export default function FriendsPage() {
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? <FriendsContent /> : <div className="pt-16 text-center t-small">One moment…</div>}
    </AppShell>
  );
}

function FriendsContent() {
  const { feed } = useSession();
  const { state, reload } = useFeed(feed);
  const [finding, setFinding] = useState(false);

  return (
    <>
      <PageHeader
        overline="From your friends"
        title="What's earning encores."
        subtitle="A quiet feed of what the people whose taste you trust are rating."
        right={
          <Button variant="ghost" size="sm" icon={<Icon.Plus size={14} />} onClick={() => setFinding((v) => !v)}>
            Find people
          </Button>
        }
      />

      {finding && <FindPeople />}

      {state.kind === "loading" && (
        <Card padding={32} className="text-center"><p className="t-small">Loading the feed…</p></Card>
      )}

      {state.kind === "error" && (
        <Card padding={32} className="text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="t-h3">Can&rsquo;t load the feed.</p>
            <p className="t-small">{state.message}</p>
            <Button variant="ghost" onClick={() => void reload()}>Try again</Button>
          </div>
        </Card>
      )}

      {state.kind === "loaded" && state.items.length === 0 && (
        <Card padding={32} className="text-center">
          <p className="t-h3 mb-2">Quiet in here.</p>
          <p className="t-small mb-4">Follow a few people and their encores will land here.</p>
          <Button variant="primary" onClick={() => setFinding(true)}>Find people to follow</Button>
        </Card>
      )}

      {state.kind === "loaded" && state.items.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {state.items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const albumId = item.subject_type === "album" ? item.subject_id : item.album_id_for_track;
  const headline =
    item.subject_type === "album"
      ? item.album_title ?? "an album"
      : item.track_title ?? "a track";
  const isFive = item.score === 5;

  return (
    <Card padding={22}>
      <div className="grid grid-cols-[48px_1fr_auto] gap-[18px] items-start">
        <Link href={`/u/${item.rater_handle}`}>
          <Avatar name={item.rater_display_name} size={48} />
        </Link>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link href={`/u/${item.rater_handle}`} className="t-label hover:underline">
              {item.rater_display_name}
            </Link>
            <span className="t-caption">@{item.rater_handle}</span>
            <span className="t-caption">· {relativeTime(item.updated_at)}</span>
            {isFive && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.16em] text-brass">
                Standing ovation
              </span>
            )}
          </div>

          <Link
            href={albumId ? `/album/${albumId}` : "#"}
            className="mt-3.5 flex gap-3.5 items-center group"
          >
            <AlbumArt url={item.album_artwork_url} seed={albumId ?? item.id} label={headline[0]} size={64} radius={7} />
            <div className="flex-1 min-w-0">
              <div className="font-display text-fg leading-snug" style={{ fontWeight: 600, fontSize: 19 }}>{headline}</div>
              <div className="t-caption mt-0.5">
                {item.subject_type === "track" && item.album_title ? `${item.album_title} · ` : ""}
                {item.album_artist ?? ""}
              </div>
              <div className="mt-1.5"><StarRow value={item.score} size={14} /></div>
            </div>
          </Link>

          {item.review_text && (
            <div className="mt-3.5 pt-3.5 border-t border-hair t-editorial" style={{ fontSize: 16 }}>
              {item.review_text}
            </div>
          )}
        </div>

        <Score value={item.score} size={28} />
      </div>
    </Card>
  );
}

function FindPeople() {
  const { profiles } = useSession();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await profiles.search(term));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, profiles]);

  return (
    <Card padding={20} className="mb-6">
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-quiet pointer-events-none">
          <Icon.Search size={16} />
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find people by name or @handle…"
          className="w-full bg-surface text-fg border border-hair rounded-card pl-10 pr-3.5 py-2.5 outline-none"
        />
      </div>
      <div className="mt-3 flex flex-col">
        {searching && <p className="t-caption px-1 py-2">Searching…</p>}
        {!searching && q.trim().length >= 2 && results.length === 0 && (
          <p className="t-caption px-1 py-2">No one by that name yet.</p>
        )}
        {results.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-3 py-2.5 ${i === 0 ? "" : "border-t border-hair"}`}>
            <Link href={`/u/${u.handle}`}>
              <Avatar name={u.display_name} size={40} />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/u/${u.handle}`} className="t-label hover:underline">{u.display_name}</Link>
              <div className="t-caption">@{u.handle}</div>
            </div>
            <FollowButton followeeId={u.id} handle={u.handle} following={u.is_following} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
