"use client";

import { useState } from "react";

import { useSession } from "@/lib/auth/session";
import { useTheme, type ThemePref } from "@/lib/theme";
import { APIError } from "@/lib/api/client";
import { AppShell } from "@/components/layout/AppShell";
import { MusicboardImport } from "@/components/settings/MusicboardImport";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Icon } from "@/components/design-system/Icon";
import type { UserProfile } from "@/lib/types";

type Tab = "account" | "appearance" | "connected" | "data";

export default function SettingsPage() {
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? (
        <SettingsContent profile={status.profile} />
      ) : (
        <div className="pt-16 text-center t-small">One moment…</div>
      )}
    </AppShell>
  );
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "connected", label: "Connected services" },
  { id: "data", label: "Your data" },
];

function SettingsContent({ profile }: { profile: UserProfile }) {
  const [tab, setTab] = useState<Tab>("account");

  return (
    <>
      <PageHeader overline="Settings" title="The fine print." subtitle="Everything Encore does on your behalf. Adjust quietly." />

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-9">
        <nav className="flex md:flex-col gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative text-left rounded-[10px] px-3.5 py-2.5 text-sm transition ${
                tab === t.id ? "bg-surface text-fg font-semibold" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "account" && <AccountPane profile={profile} />}
          {tab === "appearance" && <AppearancePane />}
          {tab === "connected" && <ConnectedPane profile={profile} />}
          {tab === "data" && <DataPane handle={profile.handle} />}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────── panes ───────────────────────────

function AccountPane({ profile }: { profile: UserProfile }) {
  const { users, lastfm, setProfile } = useSession();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarURL, setAvatarURL] = useState(profile.avatar_url ?? "");
  const [lastfmName, setLastfmName] = useState(profile.lastfm_username ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingLastfm, setSavingLastfm] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function saveBio() {
    setSavingBio(true);
    setNote(null);
    try {
      const updated = await users.update({ bio: bio.trim() || null });
      setProfile(updated);
      setNote("Bio saved.");
    } catch (e) {
      setNote(e instanceof APIError ? e.message ?? "Couldn't save." : "Couldn't save.");
    } finally {
      setSavingBio(false);
    }
  }

  async function saveAvatar() {
    setSavingAvatar(true);
    setNote(null);
    try {
      const updated = await users.update({ avatarURL: avatarURL.trim() || null });
      setProfile(updated);
      setNote("Avatar saved.");
    } catch (e) {
      setNote(e instanceof APIError ? e.message ?? "Couldn't save." : "Couldn't save.");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function saveName() {
    setSavingName(true);
    setNote(null);
    try {
      const updated = await users.update({ displayName: displayName.trim() });
      setProfile(updated);
      setNote("Display name saved.");
    } catch (e) {
      setNote(e instanceof APIError ? e.message ?? "Couldn't save." : "Couldn't save.");
    } finally {
      setSavingName(false);
    }
  }

  async function saveLastfm() {
    const name = lastfmName.trim();
    setSavingLastfm(true);
    setNote(null);
    try {
      if (name) {
        const exists = await lastfm.verify(name);
        if (!exists) {
          setNote("We couldn't find that Last.fm username.");
          setSavingLastfm(false);
          return;
        }
      }
      const updated = await users.update({ lastfmUsername: name || null });
      setProfile(updated);
      setNote("Last.fm updated.");
    } catch (e) {
      setNote(e instanceof APIError ? e.message ?? "Couldn't save." : "Couldn't save.");
    } finally {
      setSavingLastfm(false);
    }
  }

  return (
    <Section title="Identity">
      <Row title="Display name" subtitle="The name your friends see on your encores.">
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            className="bg-surface text-fg border border-hair rounded-card px-3 py-2 w-56 outline-none focus:border-brass"
          />
          <Button variant="ghost" size="sm" onClick={saveName} disabled={savingName || !displayName.trim()}>
            {savingName ? "Saving…" : "Save"}
          </Button>
        </div>
      </Row>
      <Row title="Handle" subtitle="Your unique name for share links.">
        <span className="t-label">@{profile.handle}</span>
      </Row>
      <Row title="Bio" subtitle="One sentence on what you're listening to. 280 chars max.">
        <div className="flex gap-2 items-start">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="Late-night listener…"
            className="bg-surface text-fg border border-hair rounded-card px-3 py-2 w-64 outline-none focus:border-brass resize-y"
          />
          <Button variant="ghost" size="sm" onClick={saveBio} disabled={savingBio}>
            {savingBio ? "Saving…" : "Save"}
          </Button>
        </div>
      </Row>
      <Row title="Avatar URL" subtitle="A link to a square image. Upload-to-Encore comes later.">
        <div className="flex gap-2">
          <input
            value={avatarURL}
            onChange={(e) => setAvatarURL(e.target.value)}
            maxLength={500}
            placeholder="https://…"
            className="bg-surface text-fg border border-hair rounded-card px-3 py-2 w-64 outline-none focus:border-brass"
          />
          <Button variant="ghost" size="sm" onClick={saveAvatar} disabled={savingAvatar}>
            {savingAvatar ? "Saving…" : "Save"}
          </Button>
        </div>
      </Row>
      <Row title="Last.fm username" subtitle="Where Encore reads what you're playing.">
        <div className="flex gap-2">
          <input
            value={lastfmName}
            onChange={(e) => setLastfmName(e.target.value)}
            maxLength={64}
            placeholder="not linked"
            className="bg-surface text-fg border border-hair rounded-card px-3 py-2 w-48 outline-none focus:border-brass"
          />
          <Button variant="ghost" size="sm" onClick={saveLastfm} disabled={savingLastfm}>
            {savingLastfm ? "Checking…" : "Save"}
          </Button>
        </div>
      </Row>
      {note && <p className="t-caption pt-3">{note}</p>}
    </Section>
  );
}

function AppearancePane() {
  const { pref, setPref } = useTheme();
  return (
    <Section title="Looks">
      <Row title="Theme" subtitle="Paper by default. The archive after hours when you'd rather.">
        <Segmented<ThemePref>
          value={pref}
          onChange={setPref}
          options={[["light", "Light"], ["dark", "Dark"], ["system", "System"]]}
        />
      </Row>
    </Section>
  );
}

function ConnectedPane({ profile }: { profile: UserProfile }) {
  const linked = Boolean(profile.lastfm_username);
  return (
    <Section title="Where Encore listens">
      <Row
        title={
          <span className="inline-flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: linked ? "#1DB954" : "var(--e-border)" }} />
            Last.fm
          </span>
        }
        subtitle={
          linked
            ? `Connected as ${profile.lastfm_username} — the now-playing card reads from here.`
            : "Not connected. Add your username under Account."
        }
      >
        <span className="t-caption">{linked ? "Connected" : "—"}</span>
      </Row>
      <Row title="Spotify · Apple Music · Tidal" subtitle="Encore reads these through Last.fm's scrobbling — connect them in your Last.fm settings.">
        <span className="t-caption">via Last.fm</span>
      </Row>
    </Section>
  );
}

function DataPane({ handle }: { handle: string }) {
  const { exporter, users, signOut } = useSession();
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typedHandle, setTypedHandle] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function download(format: "csv" | "json") {
    setBusy(format);
    setErr(null);
    try {
      await exporter.download(format);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't export. Try again shortly.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount(expectedHandle: string) {
    setDeleting(true);
    setDeleteErr(null);
    try {
      await users.deleteAccount();
      // Sign out wipes tokens/dev id and routes to /auth/signed-out.
      signOut();
    } catch (e) {
      setDeleting(false);
      setDeleteErr(e instanceof Error ? e.message : "Couldn't delete the account.");
    }
  }

  return (
    <>
      <Section title="Import from Musicboard">
        <MusicboardImport />
      </Section>

      <Section title="Export your ratings">
        <p className="t-small mb-4">
          Your ratings are yours. Download your full history any time — a complete, well-formed file you can keep.
        </p>
        <div className="flex gap-2.5">
          <Button variant="pale" size="sm" icon={<Icon.List size={14} />} onClick={() => download("csv")} disabled={busy !== null}>
            {busy === "csv" ? "Preparing…" : "Download CSV"}
          </Button>
          <Button variant="pale" size="sm" icon={<Icon.List size={14} />} onClick={() => download("json")} disabled={busy !== null}>
            {busy === "json" ? "Preparing…" : "Download JSON"}
          </Button>
        </div>
        {err && <p className="t-caption pt-3">{err}</p>}
      </Section>

      <Section title="Session">
        <Row title="Sign out" subtitle="End your session on this device.">
          <Button variant="ghost" size="sm" icon={<Icon.Logout size={14} />} onClick={signOut}>
            Sign out
          </Button>
        </Row>
      </Section>

      <Section title="Danger zone">
        <Row
          title="Delete account"
          subtitle="Removes your profile, ratings, follows, and listen history. Cannot be undone."
        >
          {!confirming ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Delete account
            </Button>
          ) : (
            <div className="flex flex-col gap-2.5 items-end">
              <p className="t-caption">
                Type <strong className="text-fg">@{handle}</strong> to confirm.
              </p>
              <input
                value={typedHandle}
                onChange={(e) => setTypedHandle(e.target.value.replace(/^@/, ""))}
                placeholder={`@${handle}`}
                className="bg-surface text-fg border border-hair rounded-card px-3 py-2 w-56 outline-none focus:border-brass"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setTypedHandle(""); setDeleteErr(null); }} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => deleteAccount(handle)}
                  disabled={deleting || typedHandle.trim().toLowerCase() !== handle}
                >
                  {deleting ? "Deleting…" : "Delete forever"}
                </Button>
              </div>
              {deleteErr && <p className="t-caption">{deleteErr}</p>}
            </div>
          )}
        </Row>
      </Section>
    </>
  );
}

// ─────────────────────────── controls ───────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-9">
      <h2 className="t-h2" style={{ fontSize: 22 }}>{title}</h2>
      <DoubleRule width={36} className="mt-2 mb-4" />
      {children}
    </div>
  );
}

function Row({ title, subtitle, children }: { title: React.ReactNode; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center py-5 border-t border-hair">
      <div>
        <div className="t-label">{title}</div>
        {subtitle && <div className="t-small mt-1" style={{ maxWidth: 440 }}>{subtitle}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
}) {
  return (
    <div className="flex bg-surface border border-hair rounded-full p-[3px]">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition ${
            v === value ? "bg-fg text-page" : "text-muted hover:text-fg"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
