"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedAPI } from "@/lib/api/social";
import type { FeedItem } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "loaded"; items: FeedItem[] }
  | { kind: "error"; message: string };

export function useFeed(api: FeedAPI) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const items = await api.get();
      setState({ kind: "loaded", items });
    } catch (err) {
      setState((prev) =>
        prev.kind === "loaded"
          ? prev
          : { kind: "error", message: err instanceof Error ? err.message : "Couldn't load the feed." },
      );
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
