import { getSecret } from "./secrets";
import { HttpError } from "./http";

interface UserInfoResponse {
  user?: { name?: string };
  error?: number;
  message?: string;
}

// Last.fm error 6 = "No user with that name".
const ERROR_NO_USER = 6;

async function lastfmKey(): Promise<string> {
  // Local dev sets the key directly via env var.
  const direct = process.env.LASTFM_API_KEY;
  if (direct) return direct;

  const arn = process.env.THIRDPARTY_SECRET_ARN;
  if (!arn) throw new Error("Set LASTFM_API_KEY (local) or THIRDPARTY_SECRET_ARN (AWS)");
  const { LASTFM_API_KEY } = await getSecret(arn);
  if (!LASTFM_API_KEY) {
    throw new HttpError(503, "lastfm_unconfigured", "Last.fm API key is not set");
  }
  return LASTFM_API_KEY;
}

async function callLastfm<T>(params: Record<string, string>): Promise<T> {
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", await lastfmKey());
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  } catch {
    throw new HttpError(503, "lastfm_unavailable", "Could not reach Last.fm");
  }
  return (await res.json()) as T;
}

/**
 * Check that a Last.fm username exists via a single `user.getInfo` call.
 * Returns false for a genuinely-unknown user; throws on a Last.fm outage so
 * onboarding can tell "doesn't exist" apart from "couldn't check right now".
 */
export async function lastfmUserExists(username: string): Promise<boolean> {
  const data = await callLastfm<UserInfoResponse>({
    method: "user.getinfo",
    user: username,
  });
  if (data.error === ERROR_NO_USER) return false;
  if (data.error) {
    throw new HttpError(503, "lastfm_error", data.message ?? "Last.fm error");
  }
  return Boolean(data.user?.name);
}

/** The fields Encore renders on the now-playing card. */
export interface NowPlayingTrack {
  title: string;
  artist: string;
  album: string | null;
  artworkURL: string | null;
  trackMBID: string | null;
  lastfmURL: string | null;
}

// Last.fm returns either a single track object or an array depending on the
// account's history. We always request `limit=1`, so we normalise both shapes.
interface LastfmTrack {
  name?: string;
  url?: string;
  mbid?: string;
  artist?: { "#text"?: string; mbid?: string } | string;
  album?: { "#text"?: string; mbid?: string };
  image?: Array<{ "#text"?: string; size?: string }>;
  "@attr"?: { nowplaying?: string };
}

interface RecentTracksResponse {
  recenttracks?: {
    track?: LastfmTrack | LastfmTrack[];
  };
  error?: number;
  message?: string;
}

function pickArtwork(images: LastfmTrack["image"]): string | null {
  if (!images) return null;
  // Prefer the largest available; Last.fm orders small → extralarge.
  const order = ["extralarge", "large", "medium", "small"];
  for (const size of order) {
    const hit = images.find((img) => img.size === size && img["#text"]);
    if (hit?.["#text"]) return hit["#text"];
  }
  return null;
}

function nonEmpty(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseTrack(raw: LastfmTrack): NowPlayingTrack | null {
  const title = nonEmpty(raw.name);
  const artist = typeof raw.artist === "string"
    ? nonEmpty(raw.artist)
    : nonEmpty(raw.artist?.["#text"]);
  if (!title || !artist) return null;

  return {
    title,
    artist,
    album: typeof raw.album === "object" ? nonEmpty(raw.album?.["#text"]) : null,
    artworkURL: pickArtwork(raw.image),
    trackMBID: nonEmpty(raw.mbid),
    lastfmURL: nonEmpty(raw.url),
  };
}

/**
 * Fetch the user's currently-playing track via `user.getRecentTracks?limit=1`.
 * Returns `null` if nothing is playing right now (the most recent entry is a
 * finished scrobble, not flagged `nowplaying="true"`).
 */
export async function getNowPlaying(username: string): Promise<NowPlayingTrack | null> {
  const data = await callLastfm<RecentTracksResponse>({
    method: "user.getrecenttracks",
    user: username,
    limit: "1",
  });

  if (data.error === ERROR_NO_USER) {
    throw new HttpError(404, "lastfm_user_not_found", "Last.fm user not found");
  }
  if (data.error) {
    throw new HttpError(503, "lastfm_error", data.message ?? "Last.fm error");
  }

  // With `limit=1` plus an active now-playing track, Last.fm returns the
  // now-playing entry alongside the most recent scrobble — so scan all
  // entries for the `nowplaying="true"` flag, don't just check the first.
  const raw = data.recenttracks?.track;
  if (!raw) return null;
  const tracks = Array.isArray(raw) ? raw : [raw];
  const live = tracks.find((t) => t["@attr"]?.nowplaying === "true");
  return live ? normaliseTrack(live) : null;
}
