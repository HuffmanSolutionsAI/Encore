"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/session";
import { SectionHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/design-system/Card";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { Score } from "@/components/design-system/Score";
import { Avatar } from "@/components/design-system/Avatar";
import type { Recommendation } from "@/lib/types";

/**
 * Worth-a-listen — albums your follows rated 4.5+ that you haven't touched.
 * Hidden when there's nothing to recommend (new users / no follows).
 */
export function Recommendations() {
  const { recommendations } = useSession();
  const [items, setItems] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setItems(await recommendations.list());
      } catch {
        setItems([]);
      }
    })();
  }, [recommendations]);

  if (!items || items.length === 0) return null;
  const top = items.slice(0, 4);

  return (
    <section className="mt-12">
      <SectionHeader title="Worth a listen" subtitle="Quiet picks from the people whose taste you trust." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
        {top.map((r) => (
          <Link key={r.album_id} href={`/album/${r.album_id}`} className="block">
            <Card padding={16} className="h-full flex flex-col gap-3 hover:border-brand transition">
              <AlbumArt
                url={r.album_artwork_url}
                seed={r.album_id}
                label={r.album_title[0]}
                size="100%"
                radius={10}
                style={{ width: "100%", aspectRatio: "1 / 1", height: "auto" }}
              />
              <div>
                <div className="font-display text-fg leading-snug" style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.005em" }}>
                  {r.album_title}
                </div>
                <div className="t-caption mt-0.5 truncate">{r.album_artist}</div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Avatar name={r.top_friend.display_name} size={20} />
                <span className="t-caption truncate flex-1">
                  {r.friend_count === 1
                    ? `${r.top_friend.display_name} gave it`
                    : `${r.top_friend.display_name} + ${r.friend_count - 1} more`}
                </span>
                <Score value={r.best_score} size={16} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
