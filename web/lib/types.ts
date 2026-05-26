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

export interface NowPlayingTrack {
  title: string;
  artist: string;
  album: string | null;
  artworkURL: string | null;
  trackMBID: string | null;
  lastfmURL: string | null;
}

export interface NowPlayingResponse {
  playing: boolean;
  track: NowPlayingTrack | null;
}

export type RatingSubjectType = "track" | "album";
export type RatingSource = "now_playing" | "manual";

export interface Rating {
  id: string;
  user_id: string;
  subject_type: RatingSubjectType;
  subject_id: string;
  score: number | null;
  review_text: string | null;
  is_relisten: boolean;
  source: RatingSource;
  created_at: string;
  updated_at: string;
}

export interface SubjectHint {
  mbid?: string | null;
  title?: string;
  artist?: string;
}

export interface LibraryEntry extends Rating {
  track_title: string | null;
  album_id_for_track: string | null;
  album_title: string | null;
  album_artist: string | null;
  album_artwork_url: string | null;
}

export interface AlbumRow {
  id: string;
  mbid: string;
  title: string;
  artist_name: string;
  artist_mbid: string | null;
  release_year: number | null;
  artwork_url: string | null;
  track_count: number;
  created_at: string;
}

export interface AlbumTrackRow {
  id: string;
  mbid: string;
  title: string;
  track_number: number;
  duration_ms: number | null;
  weighted_score: number | null;
  avg_score: number | null;
  rating_count: number;
  user_score: number | null;
}

export interface AlbumHighlight {
  id: string;
  title: string;
  weighted: number;
}

export interface AlbumDetail {
  album: AlbumRow;
  tracks: AlbumTrackRow[];
  aggregate: {
    track_derived_score: number | null;
    direct_album_score: number | null;
    direct_rating_count: number;
  };
  highlights: AlbumHighlight[];
  skips: AlbumHighlight[];
  personal: {
    score: number | null;
    rated_tracks: number;
    total_tracks: number;
    album_rating: {
      score: number | null;
      review_text: string | null;
    } | null;
  };
}

export interface ServerErrorBody {
  error: string;
  message?: string;
}

