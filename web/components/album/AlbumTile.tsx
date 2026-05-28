import Link from "next/link";

import { AlbumArt } from "@/components/design-system/AlbumArt";
import { Score } from "@/components/design-system/Score";

/** Square cover + title + score + artist line. The grid unit for home,
 *  library, and search. Links to the album page when an href is given. */
export function AlbumTile({
  href,
  title,
  artist,
  sub,
  artworkURL,
  seed,
  score,
}: {
  href?: string;
  title: string;
  artist: string;
  sub?: string;
  artworkURL?: string | null;
  seed: string;
  score?: number | null;
}) {
  const body = (
    <div className="flex flex-col gap-3 text-left group">
      <AlbumArt
        url={artworkURL}
        seed={seed}
        label={title[0]}
        size="100%"
        radius={10}
        style={{ width: "100%", aspectRatio: "1 / 1", height: "auto" }}
        className="transition group-hover:shadow-warm"
      />
      <div>
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="font-display text-fg leading-snug" style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.005em" }}>
            {title}
          </div>
          {score != null && <Score value={score} size={18} />}
        </div>
        <div className="t-caption mt-0.5">
          {sub ? `${artist} · ${sub}` : artist}
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
