"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { APIClient } from "@/lib/api/client";
import { AlbumsAPI } from "@/lib/api/albums";
import { LastfmAPI } from "@/lib/api/lastfm";
import { NowPlayingAPI } from "@/lib/api/nowPlaying";
import { RatingsAPI } from "@/lib/api/ratings";
import { UsersAPI } from "@/lib/api/users";
import type { UserProfile } from "@/lib/types";
import {
  AuthError,
  consumeReturnTo,
  exchangeCode,
  refresh as refreshTokens,
  startSignIn as kickoffSignIn,
  startSignOut as kickoffSignOut,
} from "./cognito";
import { clearTokens, isExpired, loadTokens, saveTokens } from "./tokens";

const SPOTIFY_STEP_KEY = "encore.onboarding.spotify_done";

/**
 * Stage of the onboarding flow when the user is signed in but hasn't
 * finished setup. Mirrors `SessionStore.Stage` on iOS.
 */
export type OnboardingStage = "choose_handle" | "link_lastfm" | "spotify_explainer";

export type SessionStatus =
  | { kind: "launching" }
  | { kind: "signed_out"; error?: string }
  | { kind: "onboarding"; stage: OnboardingStage; profile?: UserProfile }
  | { kind: "ready"; profile: UserProfile };

interface SessionContextValue {
  status: SessionStatus;
  api: APIClient;
  users: UsersAPI;
  lastfm: LastfmAPI;
  nowPlaying: NowPlayingAPI;
  ratings: RatingsAPI;
  albums: AlbumsAPI;
  signIn: () => Promise<void>;
  signOut: () => void;
  /** Called by onboarding screens once a profile is created / updated. */
  setProfile: (profile: UserProfile) => void;
  /** Called when the user confirms they've finished the Spotify step. */
  completeSpotifyStep: () => void;
  /** Called by /auth/callback after exchanging the code for tokens. */
  hydrateAfterCallback: () => Promise<string>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>({ kind: "launching" });

  // The tokens object is held in a ref so the API client's token provider
  // (a long-lived closure) always sees the latest version without
  // re-creating the client on every refresh.
  const tokensRef = useRef(loadTokens());
  const pendingRefreshRef = useRef<Promise<string | null> | null>(null);

  // Stable API client whose token provider refreshes transparently.
  const api = useMemo(() => {
    return new APIClient(async () => {
      const current = tokensRef.current;
      if (!current) return null;
      if (!isExpired(current)) return current.accessToken;

      // Coalesce concurrent refreshes.
      if (!pendingRefreshRef.current) {
        pendingRefreshRef.current = (async () => {
          try {
            const next = await refreshTokens(current.refreshToken);
            tokensRef.current = next;
            saveTokens(next);
            return next.accessToken;
          } catch (err) {
            if (err instanceof AuthError && err.code === "refresh_expired") {
              tokensRef.current = null;
              clearTokens();
            }
            return null;
          } finally {
            pendingRefreshRef.current = null;
          }
        })();
      }
      return pendingRefreshRef.current;
    });
  }, []);

  const users = useMemo(() => new UsersAPI(api), [api]);
  const lastfm = useMemo(() => new LastfmAPI(api), [api]);
  const nowPlaying = useMemo(() => new NowPlayingAPI(api), [api]);
  const ratings = useMemo(() => new RatingsAPI(api), [api]);
  const albums = useMemo(() => new AlbumsAPI(api), [api]);

  const advanceWithProfile = useCallback((profile: UserProfile) => {
    if (!profile.lastfm_username) {
      setStatus({ kind: "onboarding", stage: "link_lastfm", profile });
      return;
    }
    const spotifyDone =
      typeof window !== "undefined" &&
      window.localStorage.getItem(SPOTIFY_STEP_KEY) === "true";
    if (!spotifyDone) {
      setStatus({ kind: "onboarding", stage: "spotify_explainer", profile });
      return;
    }
    setStatus({ kind: "ready", profile });
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await users.me();
      if (!profile) {
        setStatus({ kind: "onboarding", stage: "choose_handle" });
        return;
      }
      advanceWithProfile(profile);
    } catch (err) {
      // Treat unauthorized as signed-out; any other error stays
      // signed-out with a recovery message.
      tokensRef.current = null;
      clearTokens();
      const message =
        err instanceof Error ? err.message : "Couldn't reach Encore.";
      setStatus({ kind: "signed_out", error: message });
    }
  }, [advanceWithProfile, users]);

  // Bootstrap on mount.
  useEffect(() => {
    if (tokensRef.current) {
      void loadProfile();
    } else {
      setStatus({ kind: "signed_out" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async () => {
    try {
      await kickoffSignIn();
    } catch (err) {
      setStatus({
        kind: "signed_out",
        error:
          err instanceof Error ? err.message : "Couldn't start sign-in.",
      });
    }
  }, []);

  const signOut = useCallback(() => {
    tokensRef.current = null;
    clearTokens();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SPOTIFY_STEP_KEY);
    }
    kickoffSignOut();
  }, []);

  const setProfile = useCallback(
    (profile: UserProfile) => advanceWithProfile(profile),
    [advanceWithProfile],
  );

  const completeSpotifyStep = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SPOTIFY_STEP_KEY, "true");
    }
    setStatus((prev) => {
      if (prev.kind === "onboarding" && prev.profile) {
        return { kind: "ready", profile: prev.profile };
      }
      return prev;
    });
  }, []);

  const hydrateAfterCallback = useCallback(async () => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) throw new AuthError("missing_code");
    const tokens = await exchangeCode({ code, state });
    tokensRef.current = tokens;
    saveTokens(tokens);
    const returnTo = consumeReturnTo();
    await loadProfile();
    return returnTo;
  }, [loadProfile]);

  const value: SessionContextValue = useMemo(
    () => ({
      status,
      api,
      users,
      lastfm,
      nowPlaying,
      ratings,
      albums,
      signIn,
      signOut,
      setProfile,
      completeSpotifyStep,
      hydrateAfterCallback,
    }),
    [
      status,
      api,
      users,
      lastfm,
      nowPlaying,
      ratings,
      albums,
      signIn,
      signOut,
      setProfile,
      completeSpotifyStep,
      hydrateAfterCallback,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
