"use client";

import { useSession } from "@/lib/auth/session";
import { useProfile } from "@/lib/hooks/useProfile";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { ProfileView } from "@/components/profile/ProfileView";

export default function ProfilePage() {
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? (
        <SelfProfile handle={status.profile.handle} />
      ) : (
        <div className="pt-16 text-center t-small">One moment…</div>
      )}
    </AppShell>
  );
}

function SelfProfile({ handle }: { handle: string }) {
  const { profiles, ratings } = useSession();
  const { state, reload } = useProfile(profiles, handle);
  const lib = useLibrary(ratings);
  const recent = lib.state.kind === "loaded" ? lib.state.entries : [];

  if (state.kind === "loading") {
    return <div className="pt-16 text-center t-small">Loading your profile…</div>;
  }
  if (state.kind === "error") {
    return (
      <Card padding={32} className="text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="t-h3">Can&rsquo;t load your profile.</p>
          <p className="t-small">{state.message}</p>
          <Button variant="ghost" onClick={() => void reload()}>Try again</Button>
        </div>
      </Card>
    );
  }
  return <ProfileView profile={state.profile} recent={recent} />;
}
