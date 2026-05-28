"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/session";
import { Button } from "@/components/design-system/Button";

/** Follow / Following toggle. Optimistic, with a busy guard. */
export function FollowButton({
  followeeId,
  handle,
  following: initial,
  size = "sm",
}: {
  followeeId: string;
  handle: string;
  following: boolean;
  size?: "sm" | "md";
}) {
  const { follows } = useSession();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      if (next) await follows.follow(handle);
      else await follows.unfollow(followeeId);
    } catch {
      setFollowing(!next); // revert
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={following ? "pale" : "primary"} size={size} onClick={toggle} disabled={busy}>
      {following ? "Following" : "Follow"}
    </Button>
  );
}
