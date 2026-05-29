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
import { ExportAPI, FeedAPI, FollowsAPI, ProfilesAPI } from "@/lib/api/social";
import { SearchAPI } from "@/lib/api/search";
import { HistoryAPI, NotificationsAPI, RecommendationsAPI } from "@/lib/api/extras";
import { remoteConfig } from "@/lib/config";
import type { UserProfile } from "@/lib/types";
import {
  AuthError,
  consumeReturnTo,
  exchangeCode,
  refresh as refreshTokens,
  startSignIn as kickoffSignIn,
  startSignOut as kickoffSignOut,
} from "./cognito";
import { clearDevUserID, createDevUserID, loadDevUserID, setDevUserID } from "./dev";
import { clearTokens, isExpired, loadTokens, saveTokens } from "./tokens";

const SPOTIFY_STEP_KEY = "encore.onboarding.spotify_done";
const LASTFM_SKIP_KEY = "encore.onboarding.lastfm_skipped";

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
  follows: FollowsAPI;
  feed: FeedAPI;
  profiles: ProfilesAPI;
  exporter: ExportAPI;
  search: SearchAPI;
  history: HistoryAPI;
  recommendations: RecommendationsAPI;
  notifications: NotificationsAPI;
  signIn: () => Promise<void>;
  /** Dev-mode only: sign in as an existing local user id (no new UUID). */
  signInAs: (userId: string) => Promise<void>;
  signOut: () => void;
  /** Called by onboarding screens once a profile is created / updated. */
  setProfile: (profile: UserProfile) => void;
  /** Called when the user confirms they've finished the Spotify step. */
  completeSpotifyStep: () => void;
  skipLastfm: () => void;
  /** Called by /auth/callback after exchanging the code for tokens. */
  hydrateAfterCallback: () => Promise<string>;
  /** True when running with NEXT_PUBLIC_DEV_MODE=true. */
  devMode: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>({ kind: "launching" });
  const devMode = remoteConfig.devMode;

  // Cognito-mode state.
  const tokensRef = useRef(devMode ? null : loadTokens());
  const pendingRefreshRef = useRef<Promise<string | null> | null>(null);

  // Dev-mode state.
  const devUserIDRef = useRef<string | null>(devMode ? loadDevUserID() : null);

  // Stable API client. The auth-header provider picks the right path based
  // on the configured mode.
  const api = useMemo(() => {
    return new APIClient(async (): Promise<Record<string, string> | null> => {
      if (devMode) {
        const id = devUserIDRef.current;
        return id ? { "x-dev-user-id": id } : null;
      }

      const current = tokensRef.current;
      if (!current) return null;
      if (!isExpired(current)) {
        return { Authorization: `Bearer ${current.accessToken}` };
      }

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
      const accessToken = await pendingRefreshRef.current;
      return accessToken ? { Authorization: `Bearer ${accessToken}` } : null;
    });
  }, [devMode]);

  const users = useMemo(() => new UsersAPI(api), [api]);
  const lastfm = useMemo(() => new LastfmAPI(api), [api]);
  const nowPlaying = useMemo(() => new NowPlayingAPI(api), [api]);
  const ratings = useMemo(() => new RatingsAPI(api), [api]);
  const albums = useMemo(() => new AlbumsAPI(api), [api]);
  const follows = useMemo(() => new FollowsAPI(api), [api]);
  const feed = useMemo(() => new FeedAPI(api), [api]);
  const profiles = useMemo(() => new ProfilesAPI(api), [api]);
  const exporter = useMemo(() => new ExportAPI(api), [api]);
  const search = useMemo(() => new SearchAPI(api), [api]);
  const history = useMemo(() => new HistoryAPI(api), [api]);
  const recommendations = useMemo(() => new RecommendationsAPI(api), [api]);
  const notifications = useMemo(() => new NotificationsAPI(api), [api]);

  const advanceWithProfile = useCallback((profile: UserProfile) => {
    const lastfmSkipped =
      typeof window !== "undefined" &&
      window.localStorage.getItem(LASTFM_SKIP_KEY) === "true";
    if (!profile.lastfm_username && !lastfmSkipped) {
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
      if (devMode) {
        devUserIDRef.current = null;
        clearDevUserID();
      } else {
        tokensRef.current = null;
        clearTokens();
      }
      const message =
        err instanceof Error ? err.message : "Couldn't reach Encore.";
      setStatus({ kind: "signed_out", error: message });
    }
  }, [advanceWithProfile, devMode, users]);

  // Bootstrap on mount.
  useEffect(() => {
    const hasSession = devMode ? !!devUserIDRef.current : !!tokensRef.current;
    if (hasSession) {
      void loadProfile();
    } else {
      setStatus({ kind: "signed_out" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async () => {
    if (devMode) {
      try {
        devUserIDRef.current = createDevUserID();
        await loadProfile();
      } catch (err) {
        setStatus({
          kind: "signed_out",
          error:
            err instanceof Error ? err.message : "Couldn't start dev sign-in.",
        });
      }
      return;
    }

    try {
      await kickoffSignIn();
    } catch (err) {
      setStatus({
        kind: "signed_out",
        error:
          err instanceof Error ? err.message : "Couldn't start sign-in.",
      });
    }
  }, [devMode, loadProfile]);

  const signInAs = useCallback(
    async (userId: string) => {
      if (!devMode) throw new Error("signInAs is dev-mode only");
      try {
        setDevUserID(userId);
        devUserIDRef.current = userId;
        // Resuming an account — clear onboarding skip markers from any prior
        // session so the new account's profile drives stage selection.
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(SPOTIFY_STEP_KEY);
          window.localStorage.removeItem(LASTFM_SKIP_KEY);
        }
        await loadProfile();
      } catch (err) {
        setStatus({
          kind: "signed_out",
          error: err instanceof Error ? err.message : "Couldn't sign in to that account.",
        });
      }
    },
    [devMode, loadProfile],
  );

  const signOut = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SPOTIFY_STEP_KEY);
      window.localStorage.removeItem(LASTFM_SKIP_KEY);
    }
    if (devMode) {
      devUserIDRef.current = null;
      clearDevUserID();
      setStatus({ kind: "signed_out" });
      return;
    }
    tokensRef.current = null;
    clearTokens();
    kickoffSignOut();
  }, [devMode]);

  const setProfile = useCallback(
    (profile: UserProfile) => advanceWithProfile(profile),
    [advanceWithProfile],
  );

  const skipLastfm = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LASTFM_SKIP_KEY, "true");
    }
    setStatus((prev) => {
      if (prev.kind === "onboarding" && prev.profile) {
        const spotifyDone =
          typeof window !== "undefined" &&
          window.localStorage.getItem(SPOTIFY_STEP_KEY) === "true";
        return spotifyDone
          ? { kind: "ready", profile: prev.profile }
          : { kind: "onboarding", stage: "spotify_explainer", profile: prev.profile };
      }
      return prev;
    });
  }, []);

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
    if (devMode) throw new AuthError("not_configured", "Callback isn't used in dev mode");
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
  }, [devMode, loadProfile]);

  const value: SessionContextValue = useMemo(
    () => ({
      status,
      api,
      users,
      lastfm,
      nowPlaying,
      ratings,
      albums,
      follows,
      feed,
      profiles,
      exporter,
      search,
      history,
      recommendations,
      notifications,
      signIn,
      signInAs,
      signOut,
      setProfile,
      completeSpotifyStep,
      skipLastfm,
      hydrateAfterCallback,
      devMode,
    }),
    [
      status,
      api,
      users,
      lastfm,
      nowPlaying,
      ratings,
      albums,
      follows,
      feed,
      profiles,
      exporter,
      search,
      history,
      recommendations,
      notifications,
      signIn,
      signInAs,
      signOut,
      setProfile,
      completeSpotifyStep,
      skipLastfm,
      hydrateAfterCallback,
      devMode,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
