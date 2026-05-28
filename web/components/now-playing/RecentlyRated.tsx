"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth/session";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { Card } from "@/components/design-system/Card";
import { StarRating } from "@/components/design-system/StarRating";
import type { LibraryEntry } from "@/lib/types";

/** Compact strip of the user's most recent ratings, shown under the
 *  now-playing card to keep the home screen lived-in. Tap-through to the
 *  full library or to an album page. */
export function RecentlyRated() {
  const { ratings } = useSession();
  const { state } = useLibrary(ratings);

  if (state.kind !== "loaded" || state.entries.length === 0) return null;

  const recent = state.entries.slice(0, 5);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-encore-faint text-xs uppercase tracking-wider">
          Recently rated
        </h2>
        <Link
          href="/library"
          className="text-encore-accent text-xs underline-offset-2 hover:underline"
        >
          View all
        </Link>
      </header>
      <ul className="flex flex-col gap-2">
        {recent.map((entry) => (
          <li key={entry.id}>
            <RecentRow entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentRow({ entry }: { entry: LibraryEntry }) {
  const target =
    entry.subject_type === "album"
      ? entry.subject_id
      : entry.album_id_for_track;
  const title =
    entry.subject_type === "album"
      ? (entry.album_title ?? "Untitled album")
      : (entry.track_title ?? "Untitled track");

  const row = (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <Artwork url={entry.album_artwork_url} />
        <div className="flex-1 min-w-0">
          <p className="text-encore text-sm truncate">{title}</p>
          {entry.album_artist && (
            <p className="text-encore-faint text-xs truncate">{entry.album_artist}</p>
          )}
        </div>
        <StarRating score={entry.score} size={12} />
      </div>
    </Card>
  );

  return target ? (
    <Link href={`/album/${target}`} className="block">{row}</Link>
  ) : (
    row
  );
}

function Artwork({ url }: { url: string | null }) {
  return (
    <div className="w-10 h-10 rounded-md overflow-hidden border border-encore-hairline bg-encore-surface flex items-center justify-center flex-shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-encore-faint text-xs">♪</span>
      )}
    </div>
  );
}
