"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";
import { StarRating } from "@/components/design-system/StarRating";
import type { LibraryEntry } from "@/lib/types";

/** Build spec F5 (minimal): list of the signed-in user's ratings. Search
 *  + filter + sort polish lands in M5. */
export default function LibraryPage() {
  const { ratings, status } = useSession();
  const router = useRouter();
  const { state, reload } = useLibrary(ratings);

  useEffect(() => {
    if (status.kind === "signed_out") router.replace("/auth/signin");
  }, [status.kind, router]);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-encore-accent text-sm underline">
            ← Now playing
          </Link>
          <h1 className="font-display text-3xl">Library</h1>
          <DoubleRule width={64} />
        </header>

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

        {state.kind === "loaded" && state.entries.length === 0 && (
          <Card padding="lg" className="text-center">
            <p className="font-display text-xl mb-2">Nothing in here yet.</p>
            <p className="text-encore-soft">
              Rate the last song that stopped you in your tracks.
            </p>
          </Card>
        )}

        {state.kind === "loaded" && state.entries.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.entries.map((entry) => (
              <li key={entry.id}>
                <LibraryRow entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

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
    <Card padding="md" className="hover:opacity-95">
      <div className="flex items-center gap-3">
        <Artwork url={entry.album_artwork_url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-encore-faint text-xs uppercase tracking-wider bg-encore-surface px-2 py-0.5 rounded-full">
              {subjectChip}
            </span>
            {entry.is_relisten && (
              <span className="text-encore-accent text-xs">Relisten</span>
            )}
          </div>
          <p className="font-display text-base truncate">{displayTitle}</p>
          {entry.album_artist && (
            <p className="text-encore-soft text-sm truncate">
              {entry.album_artist}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <StarRating score={entry.score} size={14} />
            {entry.review_text && (
              <span className="text-encore-faint text-xs">✎</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (navigableAlbumID) {
    return (
      <Link href={`/album/${navigableAlbumID}`} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function Artwork({ url }: { url: string | null }) {
  return (
    <div className="w-14 h-14 rounded-lg overflow-hidden border border-encore-hairline bg-encore-surface flex items-center justify-center flex-shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-encore-faint text-xs">♪</span>
      )}
    </div>
  );
}
