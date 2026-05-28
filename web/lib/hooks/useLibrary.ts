"use client";

import { useCallback, useEffect, useState } from "react";

import type { RatingsAPI } from "@/lib/api/ratings";
import type { LibraryEntry } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "loaded"; entries: LibraryEntry[] }
  | { kind: "error"; message: string };

export function useLibrary(api: RatingsAPI) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const entries = await api.mine();
      setState({ kind: "loaded", entries });
    } catch (err) {
      // Keep a previously-good list visible during a transient failure.
      setState((prev) =>
        prev.kind === "loaded"
          ? prev
          : {
              kind: "error",
              message:
                err instanceof Error
                  ? err.message
                  : "Couldn't load your library. Try again shortly.",
            },
      );
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh when a rating is saved anywhere in the app (now-bar, album page…).
  useEffect(() => {
    const onRated = () => void load();
    window.addEventListener("encore:rated", onRated);
    return () => window.removeEventListener("encore:rated", onRated);
  }, [load]);

  return { state, reload: load };
}
