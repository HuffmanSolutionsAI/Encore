"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth/session";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { useLibraryFilter, type ScoreFilter, type SortKey, type SubjectFilter, type ListenFilter } from "@/lib/hooks/useLibraryFilter";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/design-system/Card";
import { EncoreButton } from "@/components/design-system/EncoreButton";
import { StarRating } from "@/components/design-system/StarRating";
import type { LibraryEntry } from "@/lib/types";

export default function LibraryPage() {
  const { ratings } = useSession();
  const { state, reload } = useLibrary(ratings);
  const entries = state.kind === "loaded" ? state.entries : [];
  const filter = useLibraryFilter(entries);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Header total={entries.length} shown={filter.filtered.length} active={filter.active} />

        {state.kind === "loading" && (
          <Card padding="lg" className="text-center">
            <p className="text-encore-soft">Pulling your ratings…</p>
          </Card>
        )}

        {state.kind === "error" && (
          <Card padding="lg" className="text-center">
            <div className="flex flex-col gap-3">
              <p className="font-display text-xl">Can't open the library.</p>
              <p className="text-encore-soft">{state.message}</p>
              <EncoreButton kind="secondary" onClick={() => void reload()}>
                Try again
              </EncoreButton>
            </div>
          </Card>
        )}

        {state.kind === "loaded" && entries.length === 0 && (
          <Card padding="lg" className="text-center">
            <p className="font-display text-xl mb-2">Nothing in here yet.</p>
            <p className="text-encore-soft">
              Rate the last song that stopped you in your tracks.
            </p>
          </Card>
        )}

        {state.kind === "loaded" && entries.length > 0 && (
          <>
            <FilterBar
              query={filter.filters.query}
              onQueryChange={(query) =>
                filter.setFilters((f) => ({ ...f, query }))
              }
              subject={filter.filters.subject}
              onSubjectChange={(subject) =>
                filter.setFilters((f) => ({ ...f, subject }))
              }
              listen={filter.filters.listen}
              onListenChange={(listen) =>
                filter.setFilters((f) => ({ ...f, listen }))
              }
              score={filter.filters.score}
              onScoreChange={(score) =>
                filter.setFilters((f) => ({ ...f, score }))
              }
              sort={filter.filters.sort}
              onSortChange={(sort) =>
                filter.setFilters((f) => ({ ...f, sort }))
              }
              onReset={filter.reset}
              active={filter.active}
            />

            {filter.filtered.length === 0 ? (
              <Card padding="lg" className="text-center">
                <p className="font-display text-xl mb-2">Nothing matches.</p>
                <p className="text-encore-soft">
                  Try a different search or clear the filters.
                </p>
                <div className="mt-4">
                  <EncoreButton kind="secondary" onClick={filter.reset}>
                    Clear filters
                  </EncoreButton>
                </div>
              </Card>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filter.filtered.map((entry) => (
                  <li key={entry.id}>
                    <LibraryRow entry={entry} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// MARK: - Header

function Header({
  total,
  shown,
  active,
}: {
  total: number;
  shown: number;
  active: boolean;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-display text-3xl text-encore">Library</h1>
      <p className="text-encore-faint text-sm">
        {active
          ? `Showing ${shown} of ${total} ratings.`
          : total === 0
            ? "Nothing in here yet."
            : `${total} rating${total === 1 ? "" : "s"} total.`}
      </p>
    </header>
  );
}

// MARK: - Filters

interface FilterBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  subject: SubjectFilter;
  onSubjectChange: (s: SubjectFilter) => void;
  listen: ListenFilter;
  onListenChange: (l: ListenFilter) => void;
  score: ScoreFilter;
  onScoreChange: (s: ScoreFilter) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onReset: () => void;
  active: boolean;
}

function FilterBar(props: FilterBarProps) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-3">
        <SearchInput value={props.query} onChange={props.onQueryChange} />

        <div className="flex flex-wrap items-center gap-3">
          <ChipGroup
            label="Type"
            value={props.subject}
            onChange={props.onSubjectChange}
            options={[
              { value: "all", label: "All" },
              { value: "song", label: "Songs" },
              { value: "album", label: "Albums" },
            ]}
          />
          <ChipGroup
            label="Listen"
            value={props.listen}
            onChange={props.onListenChange}
            options={[
              { value: "all", label: "All" },
              { value: "first", label: "First listen" },
              { value: "relisten", label: "Relisten" },
            ]}
          />
          <ChipGroup
            label="Score"
            value={props.score}
            onChange={props.onScoreChange}
            options={[
              { value: "all", label: "Any" },
              { value: "five", label: "5★" },
              { value: "four_plus", label: "4+★" },
              { value: "three_plus", label: "3+★" },
              { value: "unrated", label: "No stars" },
            ]}
          />

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-encore-faint text-xs uppercase tracking-wider">
              Sort
            </label>
            <select
              value={props.sort}
              onChange={(e) => props.onSortChange(e.target.value as SortKey)}
              className="bg-encore-surface text-encore text-sm border border-encore-hairline rounded-md px-2 py-1 focus:outline-none focus:border-encore-brass"
            >
              <option value="updated_desc">Newest</option>
              <option value="updated_asc">Oldest</option>
              <option value="score_desc">Highest score</option>
              <option value="score_asc">Lowest score</option>
            </select>
            {props.active && (
              <button
                type="button"
                onClick={props.onReset}
                className="text-encore-faint text-xs underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 text-encore-faint pointer-events-none"
      >
        <svg viewBox="0 0 24 24" width={16} height={16}>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="16" x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, artist, or review…"
        className="w-full pl-9 pr-3 py-2 bg-encore text-encore border border-encore-hairline rounded-card focus:outline-none focus:border-encore-brass"
      />
    </div>
  );
}

interface ChipGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}

function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: ChipGroupProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-encore-faint text-xs uppercase tracking-wider mr-1">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
            value === opt.value
              ? "bg-encore-accent text-paper"
              : "bg-encore-surface text-encore-soft border border-encore-hairline hover:text-encore"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// MARK: - Row

function LibraryRow({ entry }: { entry: LibraryEntry }) {
  const navigableAlbumID =
    entry.subject_type === "album"
      ? entry.subject_id
      : entry.album_id_for_track;
  const displayTitle =
    entry.subject_type === "album"
      ? (entry.album_title ?? "Untitled album")
      : (entry.track_title ?? "Untitled track");
  const subjectChip = entry.subject_type === "album" ? "Album" : "Song";

  const content = (
    <Card padding="md" className="h-full hover:border-encore-brass transition">
      <div className="flex items-center gap-3">
        <Artwork url={entry.album_artwork_url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-encore-faint text-[10px] uppercase tracking-wider bg-encore px-1.5 py-0.5 rounded-full border border-encore-hairline">
              {subjectChip}
            </span>
            {entry.is_relisten && (
              <span className="text-encore-accent text-[10px] uppercase tracking-wider">
                Relisten
              </span>
            )}
          </div>
          <p className="font-display text-base truncate text-encore">{displayTitle}</p>
          {entry.album_artist && (
            <p className="text-encore-soft text-sm truncate">{entry.album_artist}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <StarRating score={entry.score} size={14} />
            {entry.review_text && (
              <span className="text-encore-faint text-xs" title={entry.review_text}>✎</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (navigableAlbumID) {
    return (
      <Link href={`/album/${navigableAlbumID}`} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}

function Artwork({ url }: { url: string | null }) {
  return (
    <div className="w-16 h-16 rounded-lg overflow-hidden border border-encore-hairline bg-encore-surface flex items-center justify-center flex-shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-encore-faint text-sm">♪</span>
      )}
    </div>
  );
}
