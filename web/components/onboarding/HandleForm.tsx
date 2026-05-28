"use client";

import { useState } from "react";

import { APIError } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { EncoreButton } from "@/components/design-system/EncoreButton";

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

export function HandleForm() {
  const { users, setProfile } = useSession();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalised = handle.trim().toLowerCase();
  const handleValid = HANDLE_RE.test(normalised);
  const displayNameValid = displayName.trim().length >= 1;
  const canSubmit = handleValid && displayNameValid && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const profile = await users.create({
        handle: normalised,
        displayName: displayName.trim(),
      });
      setProfile(profile);
    } catch (err) {
      if (err instanceof APIError && err.serverCode === "handle_taken") {
        setError("That handle is already taken. Try another.");
      } else if (err instanceof APIError && err.code === "validation") {
        setError(err.message || "That value isn't valid.");
      } else {
        setError("Couldn't save that. Try again shortly.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Card padding={28} className="w-full">
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <header className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-2xl">Pick a handle.</h2>
          <DoubleRule width={48} />
          <p className="text-muted text-sm">
            How friends find you on Encore.
          </p>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-quiet text-xs uppercase tracking-wider">
            Display name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            placeholder="Your name"
            className="bg-surface text-fg px-3 py-2 rounded-card border border-hair focus:outline-none focus:border-brass"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-quiet text-xs uppercase tracking-wider">
            Handle
          </span>
          <div className="flex items-stretch rounded-card border border-hair overflow-hidden bg-surface">
            <span className="px-3 py-2 text-muted border-r border-hair select-none">
              @
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              maxLength={30}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="handle"
              className="bg-transparent text-fg px-3 py-2 flex-1 focus:outline-none"
            />
          </div>
          <span className="text-quiet text-xs">
            3–30 chars: lowercase letters, numbers, underscore.
          </span>
        </label>

        {error && <p className="text-muted text-sm">{error}</p>}

        <EncoreButton type="submit" kind="primary" disabled={!canSubmit}>
          {submitting ? "Saving…" : "Continue"}
        </EncoreButton>
      </form>
    </Card>
  );
}
