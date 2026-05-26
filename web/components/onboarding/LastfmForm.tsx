"use client";

import { useState } from "react";

import { APIError } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";

const USERNAME_RE = /^[^\s]{1,64}$/;

export function LastfmForm() {
  const { lastfm, users, setProfile } = useSession();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = username.trim();
  const looksValid = USERNAME_RE.test(trimmed);
  const canSubmit = looksValid && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const exists = await lastfm.verify(trimmed);
      if (!exists) {
        setError("We couldn't find that username on Last.fm. Double-check the spelling?");
        setSubmitting(false);
        return;
      }
      const profile = await users.update({ lastfmUsername: trimmed });
      setProfile(profile);
    } catch (err) {
      if (err instanceof APIError && err.serverCode === "lastfm_unavailable") {
        setError("Last.fm is having a moment. Try again in a bit.");
      } else if (err instanceof APIError && err.code === "validation") {
        setError(err.message || "That username doesn't look right.");
      } else {
        setError("Couldn't save that. Try again shortly.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="w-full">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <header className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-2xl">Connect Last.fm.</h2>
          <DoubleRule width={48} />
          <p className="text-encore-soft text-sm">
            Encore reads what you're playing through your Last.fm account.
            Just your username — no password needed.
          </p>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-encore-faint text-xs uppercase tracking-wider">
            Last.fm username
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={64}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="your-lastfm-name"
            className="bg-encore-surface text-encore px-3 py-2 rounded-card border border-encore-hairline focus:outline-none focus:border-encore-brass"
            autoFocus
          />
        </label>

        {error && <p className="text-encore-soft text-sm">{error}</p>}

        <EncoreButton type="submit" kind="primary" disabled={!canSubmit}>
          {submitting ? "Checking…" : "Continue"}
        </EncoreButton>

        <p className="text-encore-faint text-xs text-center">
          No Last.fm account yet?{" "}
          <a
            href="https://www.last.fm/join"
            target="_blank"
            rel="noreferrer"
            className="text-encore-accent underline"
          >
            Create one
          </a>
          , then come back.
        </p>
      </form>
    </Card>
  );
}
