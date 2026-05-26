"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useSession } from "@/lib/auth/session";
import { RATING_PROMPT } from "@/lib/config";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";
import { StarRating } from "@/components/design-system/StarRating";
import type {
  NowPlayingTrack,
  Rating,
  RatingSource,
} from "@/lib/types";

/** What's being rated. Mirrors `RatingSubject` on the iOS side. */
export type RatingSubject =
  | { kind: "now_playing"; track: NowPlayingTrack }
  | {
      kind: "catalog_track";
      id: string;
      title: string;
      albumTitle: string | null;
      artist: string;
      artworkURL: string | null;
    }
  | {
      kind: "catalog_album";
      id: string;
      title: string;
      artist: string;
      artworkURL: string | null;
    };

interface RateModalProps {
  subject: RatingSubject;
  initialScore?: number | null;
  initialReview?: string | null;
  initialIsRelisten?: boolean;
  onClose: () => void;
  onSaved?: (saved: Rating) => void;
}

type Mode = "song" | "album";
type Phase = "idle" | "saving" | "saved";

export function RateModal({
  subject,
  initialScore = null,
  initialReview = null,
  initialIsRelisten = false,
  onClose,
  onSaved,
}: RateModalProps) {
  const { ratings } = useSession();

  const [mode, setMode] = useState<Mode>(
    subject.kind === "catalog_album" ? "album" : "song",
  );
  const [score, setScore] = useState<number | null>(initialScore);
  const [review, setReview] = useState(initialReview ?? "");
  const [isRelisten, setIsRelisten] = useState(initialIsRelisten);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Lock the underlying page scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const trimmed = review.trim();
  const canSave =
    (score !== null || trimmed.length > 0) && phase !== "saving";

  const subjectMeta = describe(subject, mode);
  const canSwitchToAlbum =
    subject.kind === "now_playing" && Boolean(subject.track.album);

  async function save() {
    if (!canSave) return;
    setPhase("saving");
    setError(null);
    try {
      const saved = await ratings.upsert(
        buildUpsertInput(subject, mode, {
          score,
          reviewText: trimmed.length > 0 ? trimmed : null,
          isRelisten,
        }),
      );
      setPhase("saved");
      onSaved?.(saved);
      // Brief celebration moment, then dismiss.
      setTimeout(onClose, 900);
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't save that rating. Try again shortly.",
      );
    }
  }

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card padding="lg" className="w-full">
          <div className="flex flex-col gap-5">
            <header className="flex flex-col items-center gap-2 text-center">
              <h2 id="rate-modal-title" className="font-display text-2xl text-encore-accent">
                {RATING_PROMPT}
              </h2>
              <DoubleRule width={48} />
            </header>

            <SubjectRow meta={subjectMeta} />

            {canSwitchToAlbum && (
              <ModePicker value={mode} onChange={setMode} />
            )}

            <div className="flex flex-col items-center gap-2">
              <StarRating
                score={score}
                size={36}
                onChange={(next) => setScore(next === score ? null : next)}
              />
              <div className="flex items-center justify-between w-full px-1">
                <button
                  type="button"
                  onClick={() => setScore(null)}
                  disabled={score === null}
                  className="text-encore-faint text-xs disabled:opacity-40"
                >
                  Clear stars
                </button>
                {score !== null && (
                  <span className="text-encore-accent text-xs">
                    {score.toFixed(1)} stars
                  </span>
                )}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-encore-faint text-xs uppercase tracking-wider">
                A few words (optional)
              </span>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Why's it worth an encore?"
                className="bg-encore-surface text-encore px-3 py-2 rounded-card border border-encore-hairline focus:outline-none focus:border-encore-brass resize-y"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex flex-col">
                <span className="text-encore text-sm font-medium">
                  {isRelisten ? "Relisten" : "First listen"}
                </span>
                <span className="text-encore-faint text-xs">
                  {isRelisten ? "You've heard it before." : "First time through."}
                </span>
              </div>
              <input
                type="checkbox"
                checked={isRelisten}
                onChange={(e) => setIsRelisten(e.target.checked)}
                className="w-5 h-5 accent-current text-encore-accent"
              />
            </label>

            {error && (
              <p className="text-encore-soft text-sm text-center">{error}</p>
            )}

            <EncoreButton
              kind="brass"
              onClick={save}
              disabled={!canSave}
            >
              {phase === "saving" ? "Saving…" : "Save"}
            </EncoreButton>

            {phase === "saved" && (
              <p className="text-center text-encore-accent">
                {score === 5 ? "Bravo. That's an encore." : "Saved."}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-encore-faint text-xs underline self-center"
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    </div>,
    document.body,
  );
}

// MARK: - Helpers

function ModePicker({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (next: Mode) => void;
}) {
  return (
    <div className="flex rounded-card border border-encore-hairline overflow-hidden">
      {(["song", "album"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`flex-1 py-2 text-sm font-medium ${
            value === mode
              ? "bg-encore-accent text-paper"
              : "bg-transparent text-encore-soft hover:bg-encore-surface"
          }`}
        >
          {mode === "song" ? "Song" : "Album"}
        </button>
      ))}
    </div>
  );
}

function SubjectRow({ meta }: { meta: SubjectMeta }) {
  return (
    <Card padding="sm" className="!bg-transparent">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-encore-hairline bg-encore-surface flex items-center justify-center flex-shrink-0">
          {meta.artworkURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.artworkURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-encore-faint text-xs">♪</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-display text-base truncate">{meta.title}</p>
          <p className="text-encore-soft text-sm truncate">{meta.artist}</p>
          {meta.subtitle && (
            <p className="text-encore-faint text-xs truncate">{meta.subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface SubjectMeta {
  title: string;
  artist: string;
  subtitle: string | null;
  artworkURL: string | null;
}

function describe(subject: RatingSubject, mode: Mode): SubjectMeta {
  switch (subject.kind) {
    case "now_playing":
      if (mode === "album") {
        return {
          title: subject.track.album ?? subject.track.title,
          artist: subject.track.artist,
          subtitle: null,
          artworkURL: subject.track.artworkURL,
        };
      }
      return {
        title: subject.track.title,
        artist: subject.track.artist,
        subtitle: subject.track.album,
        artworkURL: subject.track.artworkURL,
      };
    case "catalog_track":
      return {
        title: subject.title,
        artist: subject.artist,
        subtitle: subject.albumTitle,
        artworkURL: subject.artworkURL,
      };
    case "catalog_album":
      return {
        title: subject.title,
        artist: subject.artist,
        subtitle: null,
        artworkURL: subject.artworkURL,
      };
  }
}

function buildUpsertInput(
  subject: RatingSubject,
  mode: Mode,
  values: {
    score: number | null;
    reviewText: string | null;
    isRelisten: boolean;
  },
) {
  const source: RatingSource =
    subject.kind === "now_playing" ? "now_playing" : "manual";

  switch (subject.kind) {
    case "now_playing":
      return mode === "album"
        ? {
            subjectType: "album" as const,
            hint: {
              title: subject.track.album ?? subject.track.title,
              artist: subject.track.artist,
            },
            ...values,
            source,
          }
        : {
            subjectType: "track" as const,
            hint: {
              mbid: subject.track.trackMBID ?? null,
              title: subject.track.title,
              artist: subject.track.artist,
            },
            ...values,
            source,
          };
    case "catalog_track":
      return {
        subjectType: "track" as const,
        subjectID: subject.id,
        ...values,
        source,
      };
    case "catalog_album":
      return {
        subjectType: "album" as const,
        subjectID: subject.id,
        ...values,
        source,
      };
  }
}
