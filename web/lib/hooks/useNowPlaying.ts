"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { APIError } from "@/lib/api/client";
import type { NowPlayingAPI } from "@/lib/api/nowPlaying";
import type { NowPlayingTrack } from "@/lib/types";

type Kind = "loading" | "playing" | "empty" | "lastfm_not_linked" | "error";

interface NowPlayingState {
  kind: Kind;
  track: NowPlayingTrack | null;
  error: string | null;
}

type Action =
  | { type: "playing"; track: NowPlayingTrack }
  | { type: "empty" }
  | { type: "lastfm_not_linked" }
  | { type: "transient_error" }
  | { type: "fatal_error"; message: string };

function reducer(prev: NowPlayingState, action: Action): NowPlayingState {
  // A transient blip never blanks a previously-good screen.
  switch (action.type) {
    case "playing":
      return { kind: "playing", track: action.track, error: null };
    case "empty":
      return { kind: "empty", track: null, error: null };
    case "lastfm_not_linked":
      return { kind: "lastfm_not_linked", track: null, error: null };
    case "transient_error":
      if (prev.kind === "playing" || prev.kind === "empty") return prev;
      return {
        kind: "error",
        track: prev.track,
        error:
          "We've lost the signal for a moment. Your ratings are safe — try again shortly.",
      };
    case "fatal_error":
      if (prev.kind === "playing" || prev.kind === "empty") return prev;
      return { kind: "error", track: prev.track, error: action.message };
  }
}

const INITIAL: NowPlayingState = { kind: "loading", track: null, error: null };

/**
 * Poll `GET /now-playing` while the page is visible. Build spec F2: refresh
 * every 20–30 seconds. Pauses on `visibilitychange → hidden`, resumes on
 * `visible`, and survives a single fetch failure without flashing an error
 * over a previously-good track.
 */
export function useNowPlaying(
  api: NowPlayingAPI,
  options: { pollMs?: number } = {},
): {
  state: NowPlayingState;
  refresh: () => Promise<void>;
} {
  const pollMs = options.pollMs ?? 25_000;
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Hold the latest dispatch + api in refs so the polling loop's timer
  // callbacks never close over stale values.
  const apiRef = useRef(api);
  apiRef.current = api;

  const refresh = useCallback(async () => {
    try {
      const track = await apiRef.current.current();
      if (track) dispatch({ type: "playing", track });
      else dispatch({ type: "empty" });
    } catch (err) {
      if (err instanceof APIError && err.serverCode === "lastfm_not_linked") {
        dispatch({ type: "lastfm_not_linked" });
        return;
      }
      if (err instanceof APIError && err.code === "transport") {
        dispatch({ type: "transient_error" });
        return;
      }
      dispatch({
        type: "fatal_error",
        message:
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again shortly.",
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (!active) return;
      await refresh();
      if (!active) return;
      if (document.visibilityState === "visible") {
        timer = setTimeout(tick, pollMs);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timer == null) void tick();
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState === "visible") {
      void tick();
    }

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollMs, refresh]);

  return { state, refresh };
}
