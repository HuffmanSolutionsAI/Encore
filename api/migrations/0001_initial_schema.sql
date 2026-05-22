-- Encore — initial schema (build spec Section 5).
-- PostgreSQL 16 on Amazon RDS.
--
-- Authorization note: the build spec specifies Supabase Row-Level Security.
-- On the AWS stack the iOS app never connects to the database directly — it
-- calls API Gateway, and the API Lambda enforces per-user ownership using the
-- verified Cognito `sub` claim. RLS is therefore not used here; ownership is
-- checked in the API layer. `users.id` holds the Cognito `sub`.

-- users -----------------------------------------------------------------
create table users (
    id              uuid primary key,
    handle          text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
    display_name    text not null,
    avatar_url      text,
    lastfm_username text,
    created_at      timestamptz not null default now()
);

-- follows ---------------------------------------------------------------
create table follows (
    follower_id uuid not null references users (id) on delete cascade,
    followee_id uuid not null references users (id) on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (follower_id, followee_id),
    check (follower_id <> followee_id)
);
create index follows_followee_idx on follows (followee_id);

-- albums ----------------------------------------------------------------
-- Catalog cache, keyed by MusicBrainz release-group id.
create table albums (
    id           uuid primary key default gen_random_uuid(),
    mbid         text not null unique,
    title        text not null,
    artist_name  text not null,
    artist_mbid  text,
    release_year int,
    artwork_url  text,
    track_count  int not null default 0 check (track_count >= 0),
    created_at   timestamptz not null default now()
);

-- tracks ----------------------------------------------------------------
create table tracks (
    id           uuid primary key default gen_random_uuid(),
    mbid         text not null unique,
    album_id     uuid not null references albums (id) on delete cascade,
    title        text not null,
    track_number int not null default 0,
    duration_ms  int
);
create index tracks_album_idx on tracks (album_id);

-- ratings ---------------------------------------------------------------
-- score is nullable: a review with no stars is valid (build spec F3).
create table ratings (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references users (id) on delete cascade,
    subject_type text not null check (subject_type in ('track', 'album')),
    subject_id   uuid not null,
    score        numeric(2,1) check (
                     score >= 0.5 and score <= 5.0 and (score * 2) = floor(score * 2)
                 ),
    review_text  text,
    is_relisten  boolean not null default false,
    source       text not null default 'manual' check (source in ('now_playing', 'manual')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (user_id, subject_type, subject_id)
);
create index ratings_subject_idx on ratings (subject_type, subject_id);
create index ratings_user_idx on ratings (user_id, created_at desc);

-- listen_events ---------------------------------------------------------
-- Captured plays synced from Last.fm.
create table listen_events (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users (id) on delete cascade,
    track_title text not null,
    artist_name text not null,
    track_mbid  text,
    played_at   timestamptz not null,
    source      text not null default 'lastfm' check (source in ('lastfm')),
    created_at  timestamptz not null default now()
);
create index listen_events_user_idx on listen_events (user_id, played_at desc);

-- aggregates ------------------------------------------------------------
-- Server-computed scores (build spec Section 6). The scoring functions and
-- recompute triggers land in Milestone 4; these tables hold their output.
create table track_aggregates (
    track_id       uuid primary key references tracks (id) on delete cascade,
    avg_score      numeric(3,2),
    rating_count   int not null default 0,
    weighted_score numeric(3,2),
    updated_at     timestamptz not null default now()
);

create table album_aggregates (
    album_id            uuid primary key references albums (id) on delete cascade,
    track_derived_score numeric(3,2),
    direct_album_score  numeric(3,2),
    direct_rating_count int not null default 0,
    updated_at          timestamptz not null default now()
);

-- updated_at maintenance ------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger ratings_set_updated_at
    before update on ratings
    for each row execute function set_updated_at();
