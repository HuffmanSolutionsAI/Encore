"use client";

import { useCallback, useEffect, useState } from "react";

import type { AlbumsAPI } from "@/lib/api/albums";
import type { AlbumDetail } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "loaded"; detail: AlbumDetail }
  | { kind: "error"; message: string };

export function useAlbumDetail(api: AlbumsAPI, id: string) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const detail = await api.detail(id);
      setState({ kind: "loaded", detail });
    } catch (err) {
      setState((prev) =>
        prev.kind === "loaded"
          ? prev
          : {
              kind: "error",
              message:
                err instanceof Error
                  ? err.message
                  : "Couldn't load this album. Try again shortly.",
            },
      );
    }
  }, [api, id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
