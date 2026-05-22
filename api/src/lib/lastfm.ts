import { getSecret } from "./secrets";
import { HttpError } from "./http";

interface LastfmResponse {
  user?: { name?: string };
  error?: number;
  message?: string;
}

// Last.fm error 6 = "No user with that name".
const ERROR_NO_USER = 6;

/**
 * Check that a Last.fm username exists via a single `user.getInfo` call.
 * Returns false for a genuinely-unknown user; throws on a Last.fm outage so
 * onboarding can tell "doesn't exist" apart from "couldn't check right now".
 */
export async function lastfmUserExists(username: string): Promise<boolean> {
  const arn = process.env.THIRDPARTY_SECRET_ARN;
  if (!arn) throw new Error("THIRDPARTY_SECRET_ARN is not set");

  const { LASTFM_API_KEY } = await getSecret(arn);
  if (!LASTFM_API_KEY) {
    throw new HttpError(503, "lastfm_unconfigured", "Last.fm API key is not set");
  }

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "user.getinfo");
  url.searchParams.set("user", username);
  url.searchParams.set("api_key", LASTFM_API_KEY);
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  } catch {
    throw new HttpError(503, "lastfm_unavailable", "Could not reach Last.fm");
  }

  const data = (await res.json()) as LastfmResponse;
  if (data.error === ERROR_NO_USER) return false;
  if (data.error) {
    throw new HttpError(503, "lastfm_error", data.message ?? "Last.fm error");
  }
  return Boolean(data.user?.name);
}
