import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { json } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { searchReleaseGroups } from "../lib/musicbrainz";

/**
 * GET /search/albums?q=...
 * Free-text album search via MusicBrainz. Results carry the release-group
 * mbid; the client resolves the chosen one (which caches it) before opening
 * the album page.
 */
export async function searchAlbums(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  requireAuth(event);
  const q = event.queryStringParameters?.["q"]?.trim();
  if (!q || q.length < 2) return json(200, { albums: [] });
  const albums = await searchReleaseGroups(q);
  return json(200, { albums });
}
