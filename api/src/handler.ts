import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { HttpError, json } from "./lib/http";
import { createUser, deleteMe, getMe, updateMe, getProfile, searchUsers } from "./routes/users";
import { verifyLastfm } from "./routes/lastfm";
import { nowPlaying } from "./routes/nowPlaying";
import { listMyRatings, upsertRating } from "./routes/ratings";
import { getAlbum, resolveAlbum } from "./routes/albums";
import { searchAlbums } from "./routes/search";
import { follow, unfollow } from "./routes/follows";
import { getFeed } from "./routes/feed";
import { exportRatings } from "./routes/export";
import { listHistory, syncHistory } from "./routes/history";
import { getRecommendations } from "./routes/recommendations";
import { listNotifications, markRead } from "./routes/notifications";

type Route = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

interface RouteEntry {
  method: string;
  /** Either a literal path or a pattern with `:param` segments. */
  path: string;
  handler: Route;
}

// `GET /health` is exposed unauthenticated by API Gateway; every other route
// sits behind the Cognito JWT authorizer.
const routes: RouteEntry[] = [
  { method: "GET",   path: "/health",          handler: async () => json(200, { status: "ok", service: "encore-api" }) },
  { method: "GET",    path: "/users/me",        handler: getMe },
  { method: "PATCH",  path: "/users/me",        handler: updateMe },
  { method: "DELETE", path: "/users/me",        handler: deleteMe },
  { method: "GET",    path: "/users/:handle",   handler: getProfile },
  { method: "GET",    path: "/users",           handler: searchUsers },
  { method: "POST",   path: "/users",           handler: createUser },
  { method: "GET",    path: "/lastfm/verify",   handler: verifyLastfm },
  { method: "GET",    path: "/now-playing",     handler: nowPlaying },
  { method: "POST",   path: "/ratings",         handler: upsertRating },
  { method: "GET",    path: "/ratings/me",      handler: listMyRatings },
  { method: "GET",    path: "/search/albums",   handler: searchAlbums },
  { method: "GET",    path: "/albums/resolve",  handler: resolveAlbum },
  { method: "GET",    path: "/albums/:id",      handler: getAlbum },
  { method: "POST",   path: "/follows",         handler: follow },
  { method: "DELETE", path: "/follows/:id",     handler: unfollow },
  { method: "GET",    path: "/feed",            handler: getFeed },
  { method: "GET",    path: "/export",          handler: exportRatings },
  { method: "GET",    path: "/me/history",      handler: listHistory },
  { method: "POST",   path: "/me/history/sync", handler: syncHistory },
  { method: "GET",    path: "/recommendations", handler: getRecommendations },
  { method: "GET",    path: "/notifications",   handler: listNotifications },
  { method: "POST",   path: "/notifications/mark-read", handler: markRead },
];

/** Match `actual` (e.g. `/albums/abc-123`) against `pattern` (`/albums/:id`). */
function matchPath(pattern: string, actual: string): Record<string, string> | null {
  const p = pattern.split("/");
  const a = actual.split("/");
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    const ai = a[i]!;
    if (pi.startsWith(":")) {
      params[pi.slice(1)] = decodeURIComponent(ai);
    } else if (pi !== ai) {
      return null;
    }
  }
  return params;
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  for (const entry of routes) {
    if (entry.method !== method) continue;
    const params = matchPath(entry.path, path);
    if (!params) continue;
    // Backfill pathParameters so handlers can read `:id` etc. uniformly,
    // regardless of whether API Gateway provided them.
    const enriched = {
      ...event,
      pathParameters: { ...(event.pathParameters ?? {}), ...params },
    };
    try {
      return await entry.handler(enriched);
    } catch (err) {
      if (err instanceof HttpError) {
        return json(err.statusCode, { error: err.code, message: err.message });
      }
      console.error("Unhandled error", err);
      return json(500, { error: "internal", message: "Something went wrong" });
    }
  }

  return json(404, { error: "not_found", route: `${method} ${path}` });
}
