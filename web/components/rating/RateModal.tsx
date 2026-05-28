"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useSession } from "@/lib/auth/session";
import { Button } from "@/components/design-system/Button";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Overline } from "@/components/design-system/Overline";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { BRAND } from "@/components/design-system/tokens";
import type { NowPlayingTrack, Rating, RatingSource } from "@/lib/types";

/** What's being rated. */
export type RatingSubject =
  | { kind: "now_playing"; track: NowPlayingTrack }
  | { kind: "catalog_track"; id: string; title: string; albumTitle: string | null; artist: string; artworkURL: string | null }
  | { kind: "catalog_album"; id: string; title: string; artist: string; artworkURL: string | null };

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

const STAR_PATH =
  "M12 17.3l-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03z";

export function RateModal({
  subject,
  initialScore = null,
  initialReview = null,
  initialIsRelisten = false,
  onClose,
  onSaved,
}: RateModalProps) {
  const { ratings } = useSession();

  const [mode, setMode] = useState<Mode>(subject.kind === "catalog_album" ? "album" : "song");
  const [value, setValue] = useState<number | null>(initialScore);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(initialReview ?? "");
  const [isRelisten, setIsRelisten] = useState(initialIsRelisten);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const trimmed = review.trim();
  const canSave = (value !== null || trimmed.length > 0) && phase !== "saving";
  const meta = describe(subject, mode);
  const canSwitchToAlbum = subject.kind === "now_playing" && Boolean(subject.track.album);
  const display = hover || value || 0;

  async function save() {
    if (!canSave) return;
    setPhase("saving");
    setError(null);
    try {
      const saved = await ratings.upsert(
        buildUpsertInput(subject, mode, {
          score: value,
          reviewText: trimmed.length > 0 ? trimmed : null,
          isRelisten,
        }),
      );
      setPhase("saved");
      onSaved?.(saved);
      // Let any open list (library, recently-rated) refresh itself.
      window.dispatchEvent(new CustomEvent("encore:rated"));
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "We couldn't save that rating. Try again shortly.");
    }
  }

  if (typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(33,27,20,0.45)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rate this record"
        className="relative w-full max-w-[540px] max-h-[92vh] overflow-y-auto bg-page text-fg border border-hair shadow-modal"
        style={{ borderRadius: 22, padding: "32px 36px 30px" }}
      >
        {phase === "saved" ? (
          <Confirmation value={value} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Overline>Worth an encore?</Overline>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-quiet hover:text-fg text-xl leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Subject */}
            <div className="flex gap-[18px] items-center mt-[18px]">
              <AlbumArt url={meta.artworkURL} seed={meta.seed} label={meta.title[0]} size={84} radius={10} />
              <div className="min-w-0">
                <div className="font-display text-fg leading-tight" style={{ fontWeight: 600, fontSize: 26, letterSpacing: "-0.01em" }}>
                  {meta.title}
                </div>
                {meta.subtitle && (
                  <div className="t-editorial mt-1" style={{ fontSize: 15 }}>{meta.subtitle}</div>
                )}
                <div className="t-caption mt-0.5">{meta.artist}</div>
              </div>
            </div>

            {canSwitchToAlbum && <ModePicker value={mode} onChange={setMode} />}

            <DoubleRule width={42} className="my-[22px]" />

            {/* Big stars */}
            <div className="flex justify-between gap-2" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((i) => {
                const filled = i <= display;
                return (
                  <button
                    key={i}
                    onClick={() => setValue(value === i ? null : i)}
                    onMouseEnter={() => setHover(i)}
                    aria-label={`${i} stars`}
                    className="bg-transparent border-none cursor-pointer p-2 transition-transform"
                    style={{ transform: i <= hover ? "scale(1.04)" : "scale(1)" }}
                  >
                    <svg width={52} height={52} viewBox="0 0 24 24" aria-hidden>
                      <path d={STAR_PATH} fill={filled ? BRAND.brass : "var(--e-star-empty)"} />
                    </svg>
                  </button>
                );
              })}
            </div>

            <div
              className="text-center mt-2.5 font-display transition-all"
              style={{
                minHeight: 28,
                fontStyle: display === 5 ? "normal" : "italic",
                fontSize: display === 5 ? 24 : 18,
                fontWeight: display === 5 ? 600 : 400,
                color: display === 5 ? BRAND.brass : "var(--e-fg-muted)",
              }}
            >
              {scoreLabel(display)}
            </div>

            {/* Note */}
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="A note for yourself (optional). Say it once, well."
              rows={2}
              maxLength={4000}
              className="mt-[18px] w-full resize-y bg-surface border border-hair text-fg outline-none font-sans"
              style={{ borderRadius: 10, padding: "12px 14px", fontSize: 14, lineHeight: 1.5, minHeight: 64 }}
            />

            {/* Relisten */}
            <label className="flex items-center justify-between gap-3 mt-3 cursor-pointer">
              <div>
                <div className="t-label">{isRelisten ? "Relisten" : "First listen"}</div>
                <div className="t-caption">{isRelisten ? "You've heard it before." : "First time through."}</div>
              </div>
              <Switch checked={isRelisten} onChange={setIsRelisten} />
            </label>

            {error && <p className="t-small text-center mt-3">{error}</p>}

            <div className="mt-[18px] flex gap-2.5 justify-end">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" disabled={!canSave} onClick={save}>
                {phase === "saving" ? "Saving…" : "Save rating"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Confirmation({ value, onClose }: { value: number | null; onClose: () => void }) {
  const five = value === 5;
  return (
    <div className="text-center py-2">
      <Overline>{value == null ? "Review saved" : five ? "Five stars" : `${value.toFixed(1)} stars`}</Overline>
      <div
        className="font-display text-fg mt-3.5"
        style={{ fontStyle: "italic", fontSize: 36, lineHeight: 1.18, letterSpacing: "-0.01em" }}
      >
        {five ? (
          <>&ldquo;Bravo. <br />That&rsquo;s an encore.&rdquo;</>
        ) : (
          <>Saved to your library.</>
        )}
      </div>
      <div className="flex justify-center mt-[18px] gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={30} height={30} viewBox="0 0 24 24" aria-hidden>
            <path d={STAR_PATH} fill={value != null && i <= value ? BRAND.brass : "var(--e-star-empty)"} />
          </svg>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="primary" size="lg" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function ModePicker({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex mt-4 rounded-full border border-hair overflow-hidden p-[3px]">
      {(["song", "album"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex-1 py-1.5 text-[12.5px] font-semibold rounded-full transition ${
            value === m ? "bg-fg text-page" : "text-muted hover:text-fg"
          }`}
        >
          {m === "song" ? "Song" : "Album"}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-none"
      style={{
        width: 42,
        height: 24,
        borderRadius: 9999,
        background: checked ? BRAND.brass : "var(--e-border)",
        transition: "background 160ms ease",
      }}
    >
      <span
        className="absolute"
        style={{
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: 9999,
          background: BRAND.paper,
          transition: "left 160ms cubic-bezier(.4,0,.2,1)",
          boxShadow: "0 1px 3px rgba(33,27,20,0.2)",
        }}
      />
    </button>
  );
}

// MARK: - subject mapping

function scoreLabel(v: number): string {
  if (!v) return "Tap a star";
  if (v <= 1) return "Skip";
  if (v <= 2) return "Listenable";
  if (v <= 3) return "Good";
  if (v < 5) return "Strong";
  return "An encore.";
}

interface SubjectMeta {
  title: string;
  artist: string;
  subtitle: string | null;
  artworkURL: string | null;
  seed: string;
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
          seed: subject.track.album ?? subject.track.title,
        };
      }
      return {
        title: subject.track.title,
        artist: subject.track.artist,
        subtitle: subject.track.album,
        artworkURL: subject.track.artworkURL,
        seed: subject.track.title,
      };
    case "catalog_track":
      return {
        title: subject.title,
        artist: subject.artist,
        subtitle: subject.albumTitle,
        artworkURL: subject.artworkURL,
        seed: subject.id,
      };
    case "catalog_album":
      return {
        title: subject.title,
        artist: subject.artist,
        subtitle: null,
        artworkURL: subject.artworkURL,
        seed: subject.id,
      };
  }
}

function buildUpsertInput(
  subject: RatingSubject,
  mode: Mode,
  values: { score: number | null; reviewText: string | null; isRelisten: boolean },
) {
  const source: RatingSource = subject.kind === "now_playing" ? "now_playing" : "manual";
  switch (subject.kind) {
    case "now_playing":
      return mode === "album"
        ? {
            subjectType: "album" as const,
            hint: { title: subject.track.album ?? subject.track.title, artist: subject.track.artist },
            ...values,
            source,
          }
        : {
            subjectType: "track" as const,
            hint: { mbid: subject.track.trackMBID ?? null, title: subject.track.title, artist: subject.track.artist },
            ...values,
            source,
          };
    case "catalog_track":
      return { subjectType: "track" as const, subjectID: subject.id, ...values, source };
    case "catalog_album":
      return { subjectType: "album" as const, subjectID: subject.id, ...values, source };
  }
}
