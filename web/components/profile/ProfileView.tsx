"use client";

import Link from "next/link";

import { Card } from "@/components/design-system/Card";
import { Overline } from "@/components/design-system/Overline";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Avatar } from "@/components/design-system/Avatar";
import { AlbumTile } from "@/components/album/AlbumTile";
import { FollowButton } from "@/components/social/FollowButton";
import type { LibraryEntry, PublicProfile } from "@/lib/types";

/**
 * Profile surface — used for both your own (`/profile`) and others
 * (`/u/[handle]`). Recently-rated is only shown for self (we surface other
 * people's ratings through the feed, per the spec).
 */
export function ProfileView({
  profile,
  recent,
}: {
  profile: PublicProfile;
  recent?: LibraryEntry[];
}) {
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* Identity strip */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-7 items-center pb-9 border-b border-hair">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={96} />
        <div>
          <Overline>@{profile.handle}</Overline>
          <h1 className="t-h1 mt-2">{profile.display_name}</h1>
          {profile.bio && (
            <p className="t-editorial mt-3" style={{ fontSize: 16, maxWidth: 520 }}>
              {profile.bio}
            </p>
          )}
          <div className="t-caption mt-2.5">
            On Encore since {joined} · {profile.stats.followers} followers · {profile.stats.following} following
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {profile.is_self ? (
            <span className="t-caption text-right">This is you</span>
          ) : (
            <FollowButton
              followeeId={profile.id}
              handle={profile.handle}
              following={profile.is_following}
              size="md"
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8">
        <Stat label="Records" value={profile.stats.records} sub="rated all-time" />
        <Stat label="Ovations" value={profile.stats.ovations} sub="five-star encores" />
        <Stat label="Followers" value={profile.stats.followers} sub="people following" />
        <Stat label="Following" value={profile.stats.following} sub="people they follow" />
      </div>

      {/* Recently rated (self only) */}
      {profile.is_self && recent && recent.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="t-h2">Recently rated</h2>
              <DoubleRule width={36} className="mt-3" />
            </div>
            <Link href="/library" className="text-[13.5px] font-semibold text-brand">Open library →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mt-5">
            {recent.slice(0, 8).map((entry) => {
              const albumId = entry.subject_type === "album" ? entry.subject_id : entry.album_id_for_track;
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
      )}

      {!profile.is_self && (
        <p className="t-caption mt-8">
          {profile.display_name}&rsquo;s ratings show up in your feed once you follow them.
        </p>
      )}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <Card padding={22}>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-quiet">{label}</div>
      <div className="t-score mt-3" style={{ fontSize: 44 }}>{value}</div>
      <div className="t-caption mt-1.5">{sub}</div>
    </Card>
  );
}
