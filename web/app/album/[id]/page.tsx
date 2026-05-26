"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { useAlbumDetail } from "@/lib/hooks/useAlbumDetail";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";
import { StarRating } from "@/components/design-system/StarRating";
import { RateModal, type RatingSubject } from "@/components/rating/RateModal";
import type { AlbumDetail, AlbumHighlight, AlbumTrackRow } from "@/lib/types";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

/** Build spec F6 album page: scores, tracklist, highlights/skips, personal
 *  coverage. Friends' ratings land in M6. */
export default function AlbumPage(props: AlbumPageProps) {
  const { id } = use(props.params);
  const { albums, status } = useSession();
  const router = useRouter();
  const { state, reload } = useAlbumDetail(albums, id);
  const [ratingSubject, setRatingSubject] = useState<RatingSubject | null>(null);

  useEffect(() => {
    if (status.kind === "signed_out") router.replace("/auth/signin");
  }, [status.kind, router]);

  function rateAlbum(detail: AlbumDetail) {
    setRatingSubject({
      kind: "catalog_album",
      id: detail.album.id,
      title: detail.album.title,
      artist: detail.album.artist_name,
      artworkURL: detail.album.artwork_url,
    });
  }

  function rateTrack(detail: AlbumDetail, track: AlbumTrackRow) {
    setRatingSubject({
      kind: "catalog_track",
      id: track.id,
      title: track.title,
      albumTitle: detail.album.title,
      artist: detail.album.artist_name,
      artworkURL: detail.album.artwork_url,
    });
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <header className="flex flex-col items-center gap-2 text-center">
            <Link href="/library" className="text-encore-accent text-sm underline">
              ← Library
            </Link>
          </header>

          {state.kind === "loading" && (
            <Card padding="lg" className="text-center">
              <p className="text-encore-soft">Loading album…</p>
            </Card>
          )}

          {state.kind === "error" && (
            <Card padding="lg" className="text-center">
              <div className="flex flex-col gap-3">
                <p className="font-display text-xl">Can't open this album.</p>
                <p className="text-encore-soft">{state.message}</p>
                <EncoreButton kind="secondary" onClick={() => void reload()}>
                  Try again
                </EncoreButton>
              </div>
            </Card>
          )}

          {state.kind === "loaded" && (
            <>
              <Hero detail={state.detail} />
              <ScoresPanel
                detail={state.detail}
                onRateAlbum={() => rateAlbum(state.detail)}
              />
              <Tracklist
                detail={state.detail}
                onRateTrack={(track) => rateTrack(state.detail, track)}
              />
              {(state.detail.highlights.length > 0 ||
                state.detail.skips.length > 0) && (
                <HighlightsPanel detail={state.detail} />
              )}
            </>
          )}
        </div>
      </main>

      {ratingSubject && (
        <RateModal
          subject={ratingSubject}
          initialScore={initialScore(state, ratingSubject)}
          initialReview={initialReview(state, ratingSubject)}
          onClose={() => setRatingSubject(null)}
          onSaved={() => void reload()}
        />
      )}
    </>
  );
}

function initialScore(
  state: ReturnType<typeof useAlbumDetail>["state"],
  subject: RatingSubject,
): number | null {
  if (state.kind !== "loaded") return null;
  if (subject.kind === "catalog_album") {
    return state.detail.personal.album_rating?.score ?? null;
  }
  if (subject.kind === "catalog_track") {
    const t = state.detail.tracks.find((tr) => tr.id === subject.id);
    return t?.user_score ?? null;
  }
  return null;
}

function initialReview(
  state: ReturnType<typeof useAlbumDetail>["state"],
  subject: RatingSubject,
): string | null {
  if (state.kind !== "loaded") return null;
  if (subject.kind === "catalog_album") {
    return state.detail.personal.album_rating?.review_text ?? null;
  }
  return null;
}

// MARK: - Sections

function Hero({ detail }: { detail: AlbumDetail }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-56 h-56 rounded-xl overflow-hidden border border-encore-hairline bg-encore-surface flex items-center justify-center">
        {detail.album.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.album.artwork_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-encore-faint text-3xl">♪</span>
        )}
      </div>
      <h1 className="font-display text-3xl">{detail.album.title}</h1>
      <p className="text-encore-soft">{detail.album.artist_name}</p>
      {detail.album.release_year && (
        <p className="text-encore-faint text-sm">{detail.album.release_year}</p>
      )}
    </div>
  );
}

function ScoresPanel({
  detail,
  onRateAlbum,
}: {
  detail: AlbumDetail;
  onRateAlbum: () => void;
}) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 items-start text-center">
          <ScoreColumn
            label="From songs"
            score={detail.aggregate.track_derived_score}
            size={3}
          />
          <ScoreColumn
            label="Direct"
            score={detail.aggregate.direct_album_score}
            size={2}
            sub={`${detail.aggregate.direct_rating_count} ratings`}
          />
        </div>
        <DoubleRule width={80} />
        <PersonalRow personal={detail.personal} />
        <EncoreButton kind="brass" icon={<StarGlyph />} onClick={onRateAlbum}>
          Rate this album
        </EncoreButton>
      </div>
    </Card>
  );
}

function ScoreColumn({
  label,
  score,
  size,
  sub,
}: {
  label: string;
  score: number | null;
  size: 2 | 3;
  sub?: string;
}) {
  const fontClass = size === 3 ? "text-4xl" : "text-2xl";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-encore-faint text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className={`font-display ${fontClass} text-encore-accent`}>
        {score == null ? "—" : score.toFixed(2)}
      </span>
      {sub && <span className="text-encore-faint text-xs">{sub}</span>}
    </div>
  );
}

function PersonalRow({ personal }: { personal: AlbumDetail["personal"] }) {
  const coverage =
    personal.total_tracks > 0
      ? `based on ${personal.rated_tracks} of ${personal.total_tracks} tracks`
      : `based on ${personal.rated_tracks} tracks`;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-encore-faint text-xs uppercase tracking-wider">
        Your score
      </span>
      {personal.score == null ? (
        <p className="text-encore-soft">Not yet rated</p>
      ) : (
        <p className="font-display text-xl">{personal.score.toFixed(2)}</p>
      )}
      <p className="text-encore-faint text-xs">{coverage}</p>
    </div>
  );
}

function Tracklist({
  detail,
  onRateTrack,
}: {
  detail: AlbumDetail;
  onRateTrack: (track: AlbumTrackRow) => void;
}) {
  if (detail.tracks.length === 0) {
    return (
      <p className="text-center text-encore-soft text-sm">
        No tracks in the catalog for this album.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-encore-faint text-xs uppercase tracking-wider">Tracks</h2>
      <Card padding="none">
        <ul className="divide-y divide-encore-hairline">
          {detail.tracks.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => onRateTrack(track)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-encore-surface"
              >
                <span className="text-encore-faint text-xs w-6 text-right tabular-nums">
                  {track.track_number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-encore text-sm truncate">{track.title}</p>
                  {track.weighted_score != null && (
                    <p className="text-encore-faint text-xs">
                      crowd {track.weighted_score.toFixed(2)} · {track.rating_count}
                    </p>
                  )}
                </div>
                {track.user_score != null ? (
                  <StarRating score={track.user_score} size={12} />
                ) : (
                  <span className="text-encore-faint text-xs">★</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function HighlightsPanel({ detail }: { detail: AlbumDetail }) {
  return (
    <div className="flex flex-col gap-3">
      {detail.highlights.length > 0 && (
        <HighlightCard title="Highlights" items={detail.highlights} />
      )}
      {detail.skips.length > 0 && (
        <HighlightCard title="Skips" items={detail.skips} />
      )}
    </div>
  );
}

function HighlightCard({
  title,
  items,
}: {
  title: string;
  items: AlbumHighlight[];
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-2">
        <h3 className="text-encore-accent text-sm font-medium">{title}</h3>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="text-encore text-sm truncate">{item.title}</span>
              <span className="text-encore-faint text-xs tabular-nums">
                {item.weighted.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
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
