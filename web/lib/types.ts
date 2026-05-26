// Shared domain types — mirror the JSON shapes returned by the API
// (`api/src/routes/*`). Field names use snake_case to match the wire
// format so we don't need a manual transform layer.

export interface UserProfile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  lastfm_username: string | null;
  created_at: string;
}

export interface ServerErrorBody {
  error: string;
  message?: string;
}
