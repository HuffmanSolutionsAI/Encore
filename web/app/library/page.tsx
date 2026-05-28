"use client";

import Link from "next/link";
import { useState } from "react";

import { useSession } from "@/lib/auth/session";
import { useLibrary } from "@/lib/hooks/useLibrary";
import {
  useLibraryFilter,
  type ListenFilter,
  type ScoreFilter,
  type SortKey,
  type SubjectFilter,
} from "@/lib/hooks/useLibraryFilter";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Pill } from "@/components/design-system/Pill";
import { Score } from "@/components/design-system/Score";
import { StarRow } from "@/components/design-system/StarRow";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { AlbumTile } from "@/components/album/AlbumTile";
import { Icon } from "@/components/design-system/Icon";
import type { LibraryEntry } from "@/lib/types";

export default function LibraryPage() {
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? (
        <LibraryContent />
      ) : (
        <div className="pt-16 text-center t-small">One moment…</div>
      )}
    </AppShell>
  );
}

function LibraryContent() {
  const { ratings } = useSession();
  const { state, reload } = useLibrary(ratings);
  const entries = state.kind === "loaded" ? state.entries : [];
  const filter = useLibraryFilter(entries);
  const [view, setView] = useState<"grid" | "list">("grid");

  const stats = computeStats(entries);

  return (
    <>
      <PageHeader
        overline="Your library"
        title="Your encores."
        subtitle={
          entries.length === 0
            ? "Everything you rate lands here."
            : `${stats.records} records · ${stats.ovations} standing ovations · ${stats.thisYear} this year.`
        }
      />

      {state.kind === "loading" && (
        <Card padding={32} className="text-center">
          <p className="t-small">Pulling your ratings…</p>
        </Card>
      )}

      {state.kind === "error" && (
        <Card padding={32} className="text-center">
          <div className="flex flex-col gap-3 items-center">
            <p className="t-h3">Can&rsquo;t open the library.</p>
            <p className="t-small">{state.message}</p>
            <Button variant="ghost" onClick={() => void reload()}>Try again</Button>
          </div>
        </Card>
      )}

      {state.kind === "loaded" && entries.length === 0 && (
        <Card padding={32} className="text-center">
          <p className="t-h3 mb-2">Nothing in here yet.</p>
          <p className="t-small">Rate the last song that stopped you in your tracks.</p>
        </Card>
      )}

      {state.kind === "loaded" && entries.length > 0 && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Records" value={stats.records} />
            <StatCard label="Standing ovations" value={stats.ovations} />
            <StatCard label="This year" value={stats.thisYear} />
            <StatCard label="Avg score" value={stats.avg ?? "—"} />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-quiet pointer-events-none">
              <Icon.Search size={16} />
            </span>
            <input
              type="search"
              value={filter.filters.query}
              onChange={(e) => filter.setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Search by title, artist, or review…"
              className="w-full bg-surface text-fg border border-hair rounded-card pl-10 pr-3.5 py-2.5 outline-none"
            />
          </div>

          {/* Filters + sort + view */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex gap-3 flex-wrap items-center">
              <ChipGroup<SubjectFilter>
                value={filter.filters.subject}
                onChange={(subject) => filter.setFilters((f) => ({ ...f, subject }))}
                options={[["all", "All"], ["song", "Songs"], ["album", "Albums"]]}
              />
              <ChipGroup<ScoreFilter>
                value={filter.filters.score}
                onChange={(score) => filter.setFilters((f) => ({ ...f, score }))}
                options={[["all", "Any"], ["five", "5★"], ["four_plus", "4+★"], ["three_plus", "3+★"], ["unrated", "No stars"]]}
              />
            </div>
            <div className="flex items-center gap-2.5">
              <select
                value={filter.filters.sort}
                onChange={(e) => filter.setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
                className="bg-surface text-fg text-[12.5px] font-semibold border border-hair rounded-full px-3.5 py-2 outline-none cursor-pointer"
              >
                <option value="updated_desc">Recently rated</option>
                <option value="updated_asc">Oldest first</option>
                <option value="score_desc">Highest rated</option>
                <option value="score_asc">Lowest rated</option>
              </select>
              <ViewToggle view={view} onChange={setView} />
              {filter.active && (
                <button onClick={filter.reset} className="t-caption underline">Clear</button>
              )}
            </div>
          </div>

          {filter.filtered.length === 0 ? (
            <Card padding={32} className="text-center">
              <p className="t-h3 mb-2">Nothing matches.</p>
              <p className="t-small mb-4">Try a different search or clear the filters.</p>
              <Button variant="ghost" onClick={filter.reset}>Clear filters</Button>
            </Card>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {filter.filtered.map((entry) => (
                <AlbumTile key={entry.id} {...tileProps(entry)} />
              ))}
            </div>
          ) : (
            <Card padding={0} className="overflow-hidden">
              {filter.filtered.map((entry, i) => (
                <LibraryRow key={entry.id} entry={entry} first={i === 0} />
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}

// ─────────────────────────── pieces ───────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding={20}>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-quiet">{label}</div>
      <div className="t-score mt-2.5" style={{ fontSize: 38 }}>{value}</div>
    </Card>
  );
}

function ChipGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(([v, label]) => (
        <Pill key={v} active={value === v} onClick={() => onChange(v)}>
          {label}
        </Pill>
      ))}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return (
    <div className="flex bg-surface border border-hair rounded-full p-[3px]">
      {([["list", Icon.List], ["grid", Icon.Grid]] as const).map(([v, Ic]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-label={`${v} view`}
          aria-pressed={view === v}
          className={`w-[30px] h-[26px] rounded-full flex items-center justify-center transition ${
            view === v ? "bg-fg text-page" : "text-quiet"
          }`}
        >
          <Ic size={13} />
        </button>
      ))}
    </div>
  );
}

function LibraryRow({ entry, first }: { entry: LibraryEntry; first: boolean }) {
  const albumId = entry.subject_type === "album" ? entry.subject_id : entry.album_id_for_track;
  const title =
    entry.subject_type === "album"
      ? entry.album_title ?? "Untitled album"
      : entry.track_title ?? "Untitled track";

  const inner = (
    <div
      className={`grid grid-cols-[48px_1fr_auto] sm:grid-cols-[48px_1fr_160px_90px] gap-4 items-center px-4 py-3 hover:bg-page transition ${
        first ? "" : "border-t border-hair"
      }`}
    >
      <AlbumArt url={entry.album_artwork_url} seed={albumId ?? entry.id} label={title[0]} size={48} radius={6} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-quiet border border-hair rounded-full px-1.5 py-0.5">
            {entry.subject_type === "album" ? "Album" : "Song"}
          </span>
          {entry.is_relisten && <span className="text-[10px] uppercase tracking-[0.14em] text-brand">Relisten</span>}
        </div>
        <div className="font-display text-fg truncate mt-0.5" style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.005em" }}>
          {title}
        </div>
        {entry.album_artist && <div className="t-caption truncate">{entry.album_artist}</div>}
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <StarRow value={entry.score} size={13} />
        {entry.review_text && <span className="t-caption" title={entry.review_text}>✎</span>}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Score value={entry.score} size={22} />
      </div>
    </div>
  );

  return albumId ? <Link href={`/album/${albumId}`} className="block">{inner}</Link> : inner;
}

function tileProps(entry: LibraryEntry) {
  const albumId = entry.subject_type === "album" ? entry.subject_id : entry.album_id_for_track;
  const title =
    entry.subject_type === "album"
      ? entry.album_title ?? "Untitled album"
      : entry.track_title ?? "Untitled track";
  return {
    href: albumId ? `/album/${albumId}` : undefined,
    title,
    artist: entry.album_artist ?? "Unknown artist",
    artworkURL: entry.album_artwork_url,
    seed: albumId ?? entry.id,
    score: entry.score,
  };
}

function computeStats(entries: LibraryEntry[]) {
  const year = new Date().getFullYear();
  const scored = entries.filter((e) => e.score != null) as Array<LibraryEntry & { score: number }>;
  const avg = scored.length > 0 ? (scored.reduce((s, e) => s + e.score, 0) / scored.length).toFixed(1) : null;
  return {
    records: entries.length,
    ovations: entries.filter((e) => e.score === 5).length,
    thisYear: entries.filter((e) => new Date(e.updated_at).getFullYear() === year).length,
    avg,
  };
}
