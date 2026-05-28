import { SectionHeader } from "@/components/layout/PageHeader";
import { AlbumTile } from "@/components/album/AlbumTile";
import type { LibraryEntry } from "@/lib/types";

/** "Recently rated" tile grid under the home hero. Presentational — the
 *  home page owns the library fetch and passes entries in. */
export function RecentlyRated({
  entries,
  onOpenLibrary,
}: {
  entries: LibraryEntry[];
  onOpenLibrary?: () => void;
}) {
  if (entries.length === 0) return null;
  const recent = entries.slice(0, 8);

  return (
    <section className="mt-12">
      <SectionHeader
        title="Recently rated"
        subtitle="The last few records you scored."
        action="See library"
        onAction={onOpenLibrary}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mt-5">
        {recent.map((entry) => {
          const albumId =
            entry.subject_type === "album" ? entry.subject_id : entry.album_id_for_track;
          const title =
            entry.subject_type === "album"
              ? entry.album_title ?? "Untitled album"
              : entry.track_title ?? "Untitled track";
          return (
            <AlbumTile
              key={entry.id}
              href={albumId ? `/album/${albumId}` : undefined}
              title={title}
              artist={entry.album_artist ?? "Unknown artist"}
              artworkURL={entry.album_artwork_url}
              seed={albumId ?? entry.id}
              score={entry.score}
            />
          );
        })}
      </div>
    </section>
  );
}
