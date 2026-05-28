"use client";

import { createContext, useContext } from "react";

import { useSession } from "@/lib/auth/session";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";

type NowPlayingValue = ReturnType<typeof useNowPlaying>;

const NowPlayingContext = createContext<NowPlayingValue | null>(null);

/**
 * Shares a single `/now-playing` poll across the app shell — the persistent
 * Now-playing bar and the home hero both read it, so we never double-poll.
 */
export function NowPlayingProvider({ children }: { children: React.ReactNode }) {
  const { nowPlaying } = useSession();
  const value = useNowPlaying(nowPlaying);
  return <NowPlayingContext.Provider value={value}>{children}</NowPlayingContext.Provider>;
}

export function useNowPlayingState(): NowPlayingValue {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) throw new Error("useNowPlayingState must be used inside <NowPlayingProvider>");
  return ctx;
}
