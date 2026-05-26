import type { APIClient } from "./client";
import type {
  LibraryEntry,
  Rating,
  RatingSource,
  RatingSubjectType,
  SubjectHint,
} from "@/lib/types";

interface UpsertInput {
  subjectType: RatingSubjectType;
  /** When the caller already knows the catalog UUID (album-page rating). */
  subjectID?: string;
  /** When the caller has only metadata (now-playing rating). */
  hint?: SubjectHint;
  score: number | null;
  reviewText: string | null;
  isRelisten: boolean;
  source: RatingSource;
}

/** Calls into `/ratings` (api/src/routes/ratings.ts). */
export class RatingsAPI {
  constructor(private readonly client: APIClient) {}

  /** `POST /ratings` — upsert keyed on (user, subject_type, subject_id). */
  async upsert(input: UpsertInput): Promise<Rating> {
    return this.client.request<Rating>("/ratings", {
      method: "POST",
      body: {
        subject_type: input.subjectType,
        subject_id: input.subjectID,
        hint: input.hint,
        score: input.score,
        review_text: input.reviewText,
        is_relisten: input.isRelisten,
        source: input.source,
      },
    });
  }

  /** `GET /ratings/me` — the signed-in user's ratings, newest first. */
  async mine(): Promise<LibraryEntry[]> {
    const result = await this.client.request<{ ratings: LibraryEntry[] }>("/ratings/me");
    return result.ratings;
  }
}
