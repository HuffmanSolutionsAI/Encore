"use client";

import { use } from "react";
import Link from "next/link";

import { useSession } from "@/lib/auth/session";
import { useProfile } from "@/lib/hooks/useProfile";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Icon } from "@/components/design-system/Icon";
import { ProfileView } from "@/components/profile/ProfileView";

export default function PublicProfilePage(props: { params: Promise<{ handle: string }> }) {
  const { handle } = use(props.params);
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? (
        <Content handle={handle} />
      ) : (
        <div className="pt-16 text-center t-small">One moment…</div>
      )}
    </AppShell>
  );
}

function Content({ handle }: { handle: string }) {
  const { profiles } = useSession();
  const { state, reload } = useProfile(profiles, handle);

  return (
    <>
      <Link href="/friends" className="inline-flex items-center gap-1 t-small mb-6 hover:text-fg">
        <Icon.ChevronLeft size={16} /> Friends
      </Link>

      {state.kind === "loading" && <div className="pt-8 text-center t-small">Loading profile…</div>}

      {state.kind === "error" && (
        <Card padding={32} className="text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="t-h3">Couldn&rsquo;t find that profile.</p>
            <p className="t-small">{state.message}</p>
            <Button variant="ghost" onClick={() => void reload()}>Try again</Button>
          </div>
        </Card>
      )}

      {state.kind === "loaded" && <ProfileView profile={state.profile} />}
    </>
  );
}
