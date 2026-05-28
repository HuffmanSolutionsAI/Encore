"use client";

import { useMemo, useState } from "react";

import type { LibraryEntry } from "@/lib/types";

export type SubjectFilter = "all" | "song" | "album";
export type ListenFilter = "all" | "first" | "relisten";
export type ScoreFilter = "all" | "five" | "four_plus" | "three_plus" | "unrated";
export type SortKey = "updated_desc" | "updated_asc" | "score_desc" | "score_asc";

export interface LibraryFilters {
  query: string;
  subject: SubjectFilter;
  listen: ListenFilter;
  score: ScoreFilter;
  sort: SortKey;
}

const DEFAULTS: LibraryFilters = {
  query: "",
  subject: "all",
  listen: "all",
  score: "all",
  sort: "updated_desc",
};

/** Client-side search + filter + sort. The library hits /ratings/me once
 *  and we slice/dice locally — works for the build-spec target of "find any
 *  one of 50+ ratings in a couple of taps." Server-side pagination is M8. */
export function useLibraryFilter(entries: readonly LibraryEntry[]) {
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULTS);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const out = entries.filter((entry) => {
      if (!matchesSubject(entry, filters.subject)) return false;
      if (!matchesListen(entry, filters.listen)) return false;
      if (!matchesScore(entry, filters.score)) return false;
      if (q && !matchesQuery(entry, q)) return false;
      return true;
    });

    out.sort(sortFn(filters.sort));
    return out;
  }, [entries, filters]);

  return {
    filters,
    setFilters,
    filtered,
    /** True if any filter / search is active. */
    active:
      filters.query.trim().length > 0 ||
      filters.subject !== "all" ||
      filters.listen !== "all" ||
      filters.score !== "all",
    reset: () => setFilters(DEFAULTS),
  };
}

function matchesSubject(entry: LibraryEntry, f: SubjectFilter): boolean {
  if (f === "all") return true;
  return entry.subject_type === f;
}

function matchesListen(entry: LibraryEntry, f: ListenFilter): boolean {
  if (f === "all") return true;
  return f === "relisten" ? entry.is_relisten : !entry.is_relisten;
}

function matchesScore(entry: LibraryEntry, f: ScoreFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "unrated":
      return entry.score === null;
    case "five":
      return entry.score === 5;
    case "four_plus":
      return entry.score !== null && entry.score >= 4;
    case "three_plus":
      return entry.score !== null && entry.score >= 3;
  }
}

function matchesQuery(entry: LibraryEntry, q: string): boolean {
  const haystack = [
    entry.track_title,
    entry.album_title,
    entry.album_artist,
    entry.review_text,
  ]
    .filter((s): s is string => !!s)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function sortFn(key: SortKey) {
  return (a: LibraryEntry, b: LibraryEntry): number => {
    switch (key) {
      case "updated_desc":
        return cmpStr(b.updated_at, a.updated_at);
      case "updated_asc":
        return cmpStr(a.updated_at, b.updated_at);
      case "score_desc":
        return cmpScore(b.score, a.score);
      case "score_asc":
        return cmpScore(a.score, b.score);
    }
  };
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function cmpScore(a: number | null, b: number | null): number {
  // Nulls sort last in both directions.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}
