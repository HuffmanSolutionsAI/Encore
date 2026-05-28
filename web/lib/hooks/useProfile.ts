"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProfilesAPI } from "@/lib/api/social";
import type { PublicProfile } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "loaded"; profile: PublicProfile }
  | { kind: "error"; message: string };

export function useProfile(api: ProfilesAPI, handle: string) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const profile = await api.byHandle(handle);
      setState({ kind: "loaded", profile });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load that profile." });
    }
  }, [api, handle]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
