"use client";

import { useState } from "react";

import { useSession } from "@/lib/auth/session";
import { Button } from "@/components/design-system/Button";
import type { ImportResponse, ImportRow } from "@/lib/api/imports";

/**
 * Musicboard import — paste a JSON array of {title, artist, score, …} from
 * the bookmarklet (or any other source). The API resolves each row via
 * MusicBrainz and upserts it. Sequential, so a few hundred ratings can
 * take a couple of minutes — we show progress and a results breakdown.
 *
 * Format expected:
 *   [
 *     {"title": "Kid A", "artist": "Radiohead", "score": 10},
 *     {"title": "OK Computer", "artist": "Radiohead", "score": 9.5, "review": "…"}
 *   ]
 */
export function MusicboardImport() {
  const { imports } = useSession();
  const [text, setText] = useState("");
  const [scale, setScale] = useState<"1-10" | "0.5-5" | "1-100">("1-10");
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  function parse(): ImportRow[] | null {
    setError(null);
    if (!text.trim()) {
      setError("Paste the JSON from your Musicboard bookmarklet first.");
      return null;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      setError("That doesn't parse as JSON. Check for stray characters.");
      return null;
    }
    if (!Array.isArray(raw)) {
      setError("Expected a JSON array. Wrap rows in [ … ].");
      return null;
    }
    const rows: ImportRow[] = [];
    for (const r of raw as Record<string, unknown>[]) {
      const title = typeof r.title === "string" ? r.title : "";
      const artist = typeof r.artist === "string" ? r.artist : "";
      const scoreRaw = r.score;
      const score =
        typeof scoreRaw === "number"
          ? scoreRaw
          : typeof scoreRaw === "string" && scoreRaw.trim()
            ? Number(scoreRaw)
            : null;
      rows.push({
        title,
        artist,
        score: score === null || Number.isNaN(score) ? null : score,
        review: typeof r.review === "string" ? r.review : null,
        rated_at: typeof r.rated_at === "string" ? r.rated_at : null,
        mbid: typeof r.mbid === "string" ? r.mbid : null,
      });
    }
    if (rows.length === 0) {
      setError("The JSON parsed, but it's empty.");
      return null;
    }
    return rows;
  }

  async function run() {
    const ratings = parse();
    if (!ratings) return;
    setPhase("running");
    setResult(null);
    try {
      const res = await imports.ratings({
        source: "musicboard",
        scoreScale: scale,
        ratings,
      });
      setResult(res);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="t-small">
        Bring your old ratings over from Musicboard or another rating app.
        Each entry runs through the MusicBrainz catalog so it can join the
        rest of your library — songs roll up into albums, friends&rsquo;
        averages still work. Already-rated albums are updated, not duplicated.
      </p>

      <div className="flex items-center gap-3">
        <label className="t-overline">Source scale</label>
        <select
          value={scale}
          onChange={(e) => setScale(e.target.value as typeof scale)}
          disabled={phase === "running"}
          className="bg-surface text-fg text-[12.5px] font-semibold border border-hair rounded-full px-3.5 py-2 outline-none"
        >
          <option value="1-10">1–10 (Musicboard)</option>
          <option value="0.5-5">0.5–5 (Encore)</option>
          <option value="1-100">1–100 (Pitchfork-style)</option>
        </select>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={phase === "running"}
        rows={8}
        placeholder='[{"title":"Kid A","artist":"Radiohead","score":10},{"title":"OK Computer","artist":"Radiohead","score":9.5}]'
        className="bg-surface text-fg border border-hair rounded-card px-3 py-2 outline-none focus:border-brass font-mono text-[12.5px] leading-snug"
      />

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={run} disabled={phase === "running" || !text.trim()}>
          {phase === "running" ? "Importing…" : "Import ratings"}
        </Button>
        {phase === "running" && (
          <span className="t-caption">
            One MusicBrainz lookup per row, sequential. A few hundred records can take a minute or two — leave the tab open.
          </span>
        )}
      </div>

      {error && <p className="t-small">{error}</p>}

      {result && (
        <div className="border border-hair rounded-card bg-surface p-4">
          <div className="flex items-baseline gap-4 mb-3">
            <span className="t-overline">Result</span>
            <span className="t-caption">
              {result.imported} imported · {result.updated} updated · {result.skipped} skipped · {result.failed} failed
            </span>
          </div>
          {result.failed > 0 && (
            <details className="t-caption">
              <summary className="cursor-pointer">Show {result.failed} failures</summary>
              <ul className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
                {result.results
                  .filter((r) => r.status === "failed")
                  .map((r, i) => (
                    <li key={i}>
                      <strong>{r.album_title}</strong> — {r.artist} · <em>{r.reason ?? "unknown"}</em>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
