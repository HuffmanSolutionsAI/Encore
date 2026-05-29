"use client";

import { use } from "react";
import Link from "next/link";

import { useSession } from "@/lib/auth/session";
import { useAlbumDetail } from "@/lib/hooks/useAlbumDetail";
import { useRate } from "@/components/rating/RateProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Overline } from "@/components/design-system/Overline";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Score } from "@/components/design-system/Score";
import { StarRow } from "@/components/design-system/StarRow";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { Avatar } from "@/components/design-system/Avatar";
import { Icon } from "@/components/design-system/Icon";
import type { AlbumDetail, AlbumTrackRow } from "@/lib/types";

export default function AlbumPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? (
        <AlbumContent id={id} />
      ) : (
        <div className="pt-16 text-center t-small">One moment…</div>
      )}
    </AppShell>
  );
}

function AlbumContent({ id }: { id: string }) {
  const { albums } = useSession();
  const { state, reload } = useAlbumDetail(albums, id);
  const { openRate } = useRate();

  function rateAlbum(detail: AlbumDetail) {
    openRate(
      {
        kind: "catalog_album",
        id: detail.album.id,
        title: detail.album.title,
        artist: detail.album.artist_name,
        artworkURL: detail.album.artwork_url,
      },
      {
        initialScore: detail.personal.album_rating?.score ?? null,
        initialReview: detail.personal.album_rating?.review_text ?? null,
        onSaved: () => void reload(),
      },
    );
  }

  function rateTrack(detail: AlbumDetail, track: AlbumTrackRow) {
    openRate(
      {
        kind: "catalog_track",
        id: track.id,
        title: track.title,
        albumTitle: detail.album.title,
        artist: detail.album.artist_name,
        artworkURL: detail.album.artwork_url,
      },
      { initialScore: track.user_score ?? null, onSaved: () => void reload() },
    );
  }

  return (
    <>
      <Link href="/library" className="inline-flex items-center gap-1 t-small mb-6 hover:text-fg">
        <Icon.ChevronLeft size={16} /> Library
      </Link>

      {state.kind === "loading" && (
        <Card padding={32} className="text-center">
          <p className="t-small">Loading album…</p>
        </Card>
      )}

      {state.kind === "error" && (
        <Card padding={32} className="text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="t-h3">Can&rsquo;t open this album.</p>
            <p className="t-small">{state.message}</p>
            <Button variant="ghost" onClick={() => void reload()}>Try again</Button>
          </div>
        </Card>
      )}

      {state.kind === "loaded" && (
        <>
          <Hero detail={state.detail} onRate={() => rateAlbum(state.detail)} />
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10">
            <Tracklist detail={state.detail} onRateTrack={(t) => rateTrack(state.detail, t)} />
            <div className="flex flex-col gap-6">
              <Friends detail={state.detail} />
              <Highlights detail={state.detail} />
            </div>
          </div>
          <Reviews detail={state.detail} />
        </>
      )}
    </>
  );
}

// ─────────────────────────── hero ───────────────────────────

function Hero({ detail, onRate }: { detail: AlbumDetail; onRate: () => void }) {
  const a = detail.album;
  const agg = detail.aggregate;
  const personal = detail.personal;
  const coverage =
    personal.total_tracks > 0
      ? `based on ${personal.rated_tracks} of ${personal.total_tracks} tracks`
      : `based on ${personal.rated_tracks} tracks`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-10 items-start">
      <AlbumArt
        url={a.artwork_url}
        seed={a.id}
        label={a.title[0]}
        size="100%"
        radius={16}
        className="shadow-lift max-w-[300px]"
        style={{ width: "100%", aspectRatio: "1 / 1", height: "auto" }}
      />

      <div>
        <Overline>Album{a.release_year ? ` · ${a.release_year}` : ""}</Overline>
        <h1 className="t-display mt-3" style={{ fontSize: 52 }}>{a.title}</h1>
        <div className="font-display text-muted mt-1.5" style={{ fontSize: 22 }}>{a.artist_name}</div>

        <DoubleRule width={56} className="my-7" />

        <div className="flex items-end gap-8 flex-wrap">
          <div>
            <Score value={agg.track_derived_score} size={80} />
            <div className="t-caption mt-1">From songs · / 5</div>
          </div>
          <div>
            <Score value={agg.direct_album_score} size={32} />
            <div className="t-caption mt-1">
              {agg.direct_rating_count} direct {agg.direct_rating_count === 1 ? "rating" : "ratings"}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Overline>Your score</Overline>
          <div className="flex items-center gap-3 mt-1.5">
            {personal.score != null ? (
              <>
                <span className="font-display text-fg" style={{ fontWeight: 600, fontSize: 22 }}>
                  {personal.score.toFixed(1)}
                </span>
                <StarRow value={personal.score} size={15} />
              </>
            ) : (
              <span className="t-small">Not yet rated</span>
            )}
          </div>
          <div className="t-caption mt-1">{coverage}</div>
        </div>

        {/* The one brass "Worth an encore?" in the product. */}
        <div className="mt-7">
          <Button variant="brass" size="lg" icon={<Icon.Music size={16} />} onClick={onRate}>
            Worth an encore?
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── tracklist ───────────────────────────

function Tracklist({ detail, onRateTrack }: { detail: AlbumDetail; onRateTrack: (t: AlbumTrackRow) => void }) {
  if (detail.tracks.length === 0) {
    return (
      <div>
        <SectionHeader title="Tracks" subtitle="No tracks in the catalog for this record yet." />
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Tracks" subtitle={`${detail.tracks.length} on the record · rate any on tap.`} />
      <Card padding={0} className="mt-5 overflow-hidden">
        <div className="grid grid-cols-[36px_1fr_64px_120px] gap-4 px-5 py-3 border-b border-hair text-[10.5px] font-bold uppercase tracking-[0.16em] text-quiet">
          <span>#</span>
          <span>Title</span>
          <span>Len</span>
          <span>Your rating</span>
        </div>
        {detail.tracks.map((trk, i) => (
          <button
            key={trk.id}
            onClick={() => onRateTrack(trk)}
            className={`grid grid-cols-[36px_1fr_64px_120px] gap-4 items-center w-full text-left px-5 py-3.5 hover:bg-page transition ${
              i === detail.tracks.length - 1 ? "" : "border-b border-hair"
            }`}
          >
            <span className="t-caption tabular-nums">{trk.track_number}</span>
            <span className="min-w-0">
              <span className="block text-fg truncate" style={{ fontSize: 15, letterSpacing: "-0.005em" }}>{trk.title}</span>
              {trk.weighted_score != null && (
                <span className="t-caption">crowd {trk.weighted_score.toFixed(1)} · {trk.rating_count}</span>
              )}
            </span>
            <span className="t-caption tabular-nums">{formatDuration(trk.duration_ms)}</span>
            <span className="flex items-center gap-2">
              {trk.user_score != null ? (
                <>
                  <StarRow value={trk.user_score} size={13} />
                  <span className="text-brass font-bold text-[12.5px] tabular-nums">{trk.user_score.toFixed(1)}</span>
                </>
              ) : (
                <span className="t-caption">Rate</span>
              )}
            </span>
          </button>
        ))}
      </Card>
    </div>
  );
}

// ─────────────────────────── friends who rated ───────────────────────────

function Friends({ detail }: { detail: AlbumDetail }) {
  if (detail.friends.length === 0) return null;
  return (
    <div>
      <SectionHeader title="Friends" subtitle="Encores among people you follow." />
      <Card padding={18} className="mt-5">
        <ul className="flex flex-col gap-3">
          {detail.friends.map((f) => (
            <li key={f.handle} className="flex items-center gap-3">
              <Link href={`/u/${f.handle}`}>
                <Avatar name={f.display_name} size={36} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/u/${f.handle}`} className="text-fg text-sm font-semibold hover:underline truncate block">
                  {f.display_name}
                </Link>
                <div className="t-caption">@{f.handle}</div>
              </div>
              <Score value={f.score} size={20} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─────────────────────────── highlights & skips ───────────────────────────

// ─────────────────────────── reviews ───────────────────────────

function Reviews({ detail }: { detail: AlbumDetail }) {
  if (detail.reviews.length === 0) return null;
  return (
    <section className="mt-12">
      <SectionHeader title="What people wrote" subtitle="Friends first, then everyone else." />
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {detail.reviews.map((r, i) => (
          <Card key={`${r.handle}-${i}`} padding={20}>
            <div className="flex items-baseline gap-2 mb-3">
              <Link href={`/u/${r.handle}`} className="t-label hover:underline">
                {r.display_name}
              </Link>
              <span className="t-caption">@{r.handle}</span>
              {r.is_friend && <span className="t-caption text-brand">· friend</span>}
              {r.score != null && (
                <span className="ml-auto">
                  <Score value={r.score} size={18} />
                </span>
              )}
            </div>
            <p className="t-editorial" style={{ fontSize: 16 }}>
              “{r.review_text}”
            </p>
            {r.subject_kind === "track" && (
              <p className="t-caption mt-3">— on a track from this album</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

function Highlights({ detail }: { detail: AlbumDetail }) {
  if (detail.highlights.length === 0 && detail.skips.length === 0) {
    return (
      <div>
        <SectionHeader title="Highlights" subtitle="They appear once tracks are rated." />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {detail.highlights.length > 0 && (
        <div>
          <SectionHeader title="Highlights" />
          <Card padding={18} className="mt-5">
            <ul className="flex flex-col gap-2">
              {detail.highlights.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <span className="text-fg text-sm truncate">{h.title}</span>
                  <Score value={h.weighted} size={16} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      {detail.skips.length > 0 && (
        <div>
          <SectionHeader title="Skips" />
          <Card padding={18} className="mt-5">
            <ul className="flex flex-col gap-2">
              {detail.skips.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <span className="text-fg text-sm truncate">{h.title}</span>
                  <Score value={h.weighted} size={16} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
