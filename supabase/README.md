# Supabase backend

Managed Postgres, Auth, Storage, and Edge Functions for Encore. See build spec
Sections 3–6 for the architecture.

## Layout

```
config.toml      Local Supabase config (CLI)
migrations/      Versioned SQL migrations — the source of truth for the schema
functions/       Edge Functions (TypeScript/Deno) — added from Milestone 2
```

## Local development

```sh
supabase start                       # boot local Postgres + Auth + Studio
supabase db reset                    # apply all migrations to the local db
```

## Deploying schema changes

```sh
supabase link --project-ref <ref>    # one-time
supabase db push                     # apply pending migrations to the hosted db
```

## Migrations

| File | Contents |
|------|----------|
| `20260522000000_initial_schema.sql` | All eight tables from build spec Section 5, indexes, the `updated_at` trigger, and Row-Level Security policies. |

Still to come:

- **M4** — the scoring functions and recompute triggers (build spec Section 6).
- **M2+** — Edge Functions: `now-playing` (Last.fm proxy), the catalog proxy, the
  Last.fm sync job, and `pg_cron` schedules.

## Secrets

Third-party API keys (Last.fm, MusicBrainz `User-Agent`, Apple sign-in) are set as Edge
Function secrets — never committed, never shipped in the iOS binary:

```sh
supabase secrets set LASTFM_API_KEY=... LASTFM_SHARED_SECRET=...
```

See `../.env.example` for the full list.
