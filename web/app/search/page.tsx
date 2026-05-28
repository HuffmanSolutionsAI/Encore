"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/design-system/Card";
import { Overline } from "@/components/design-system/Overline";
import { AlbumArt } from "@/components/design-system/AlbumArt";
import { Icon } from "@/components/design-system/Icon";
import type { AlbumSearchResult } from "@/lib/types";

export default function SearchPage() {
  const { status } = useSession();
  return (
    <AppShell>
      {status.kind === "ready" ? <SearchContent /> : <div className="pt-16 text-center t-small">One moment…</div>}
    </AppShell>
  );
}

function SearchContent() {
  const { search } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "loading" } | { kind: "loaded"; results: AlbumSearchResult[] } | { kind: "error"; message: string }>({ kind: "idle" });
  const [opening, setOpening] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = q.trim();
    if (term.length < 2) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    debounce.current = setTimeout(async () => {
      try {
        const results = await search.albums(term);
        setState({ kind: "loaded", results });
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Search is unavailable right now." });
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, search]);

  async function open(result: AlbumSearchResult) {
    if (opening) return;
    setOpening(result.mbid);
    try {
      const { id } = await search.resolveAlbum(result.mbid);
      router.push(`/album/${id}`);
    } catch {
      setOpening(null);
    }
  }

  return (
    <>
      <Overline>Search</Overline>
      <div className="mt-3 flex items-center gap-3 bg-surface border border-hair rounded-card px-5 py-3.5">
        <Icon.Search size={20} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search every album…"
          className="flex-1 bg-transparent border-none outline-none font-display text-fg"
          style={{ fontSize: 26, letterSpacing: "-0.015em" }}
        />
        {q && (
          <button onClick={() => setQ("")} className="text-quiet text-lg p-1" aria-label="Clear">×</button>
        )}
      </div>

      <div className="mt-8">
        {state.kind === "idle" && (
          <p className="t-editorial" style={{ fontSize: 17 }}>
            Find any record in the catalog, then rate it — start typing a title or an artist.
          </p>
        )}
        {state.kind === "loading" && <p className="t-small">Searching…</p>}
        {state.kind === "error" && <p className="t-small">{state.message}</p>}
        {state.kind === "loaded" && state.results.length === 0 && (
          <p className="t-small">No albums matched. Try a different spelling.</p>
        )}
        {state.kind === "loaded" && state.results.length > 0 && (
          <Card padding={0} className="overflow-hidden">
            {state.results.map((r, i) => (
              <button
                key={r.mbid}
                onClick={() => open(r)}
                disabled={opening !== null}
                className={`flex items-center gap-4 w-full text-left px-4 py-3 hover:bg-page transition disabled:opacity-60 ${
                  i === 0 ? "" : "border-t border-hair"
                }`}
              >
                <AlbumArt seed={r.mbid} label={r.title[0]} size={52} radius={7} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-fg truncate" style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.005em" }}>
                    {r.title}
                  </div>
                  <div className="t-caption truncate">
                    {r.artist}
                    {r.year ? ` · ${r.year}` : ""}
                    {r.primary_type && r.primary_type !== "Album" ? ` · ${r.primary_type}` : ""}
                  </div>
                </div>
                <span className="t-caption">{opening === r.mbid ? "Opening…" : "Open →"}</span>
              </button>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
