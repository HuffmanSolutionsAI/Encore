-- Encore — initial schema (build spec Section 5).
-- Managed Postgres on Supabase. Row-Level Security is enabled on every table.

create extension if not exists "pgcrypto";

-- users -----------------------------------------------------------------
-- App profile. Credentials live in Supabase auth.users; id matches the auth uid.
create table public.users (
    id              uuid primary key references auth.users (id) on delete cascade,
    handle          text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
    display_name    text not null,
    avatar_url      text,
    lastfm_username text,
    created_at      timestamptz not null default now()
);

-- follows ---------------------------------------------------------------
create table public.follows (
    follower_id uuid not null references public.users (id) on delete cascade,
    followee_id uuid not null references public.users (id) on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (follower_id, followee_id),
    check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

-- albums ----------------------------------------------------------------
-- Catalog cache, keyed by MusicBrainz release-group id.
create table public.albums (
    id          uuid primary key default gen_random_uuid(),
    mbid        text not null unique,
    title       text not null,
    artist_name text not null,
    artist_mbid text,
    release_year int,
    artwork_url text,
    track_count int not null default 0 check (track_count >= 0),
    created_at  timestamptz not null default now()
);

-- tracks ----------------------------------------------------------------
create table public.tracks (
    id           uuid primary key default gen_random_uuid(),
    mbid         text not null unique,
    album_id     uuid not null references public.albums (id) on delete cascade,
    title        text not null,
    track_number int not null default 0,
    duration_ms  int
);
create index tracks_album_idx on public.tracks (album_id);

-- ratings ---------------------------------------------------------------
-- score is nullable: a review with no stars is valid (build spec F3).
create table public.ratings (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.users (id) on delete cascade,
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
create index ratings_subject_idx on public.ratings (subject_type, subject_id);
create index ratings_user_idx on public.ratings (user_id, created_at desc);

-- listen_events ---------------------------------------------------------
-- Captured plays synced from Last.fm.
create table public.listen_events (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users (id) on delete cascade,
    track_title text not null,
    artist_name text not null,
    track_mbid  text,
    played_at   timestamptz not null,
    source      text not null default 'lastfm' check (source in ('lastfm')),
    created_at  timestamptz not null default now()
);
create index listen_events_user_idx on public.listen_events (user_id, played_at desc);

-- aggregates ------------------------------------------------------------
-- Server-computed scores (build spec Section 6). The scoring functions and
-- recompute triggers land in Milestone 4; these tables hold their output.
create table public.track_aggregates (
    track_id       uuid primary key references public.tracks (id) on delete cascade,
    avg_score      numeric(3,2),
    rating_count   int not null default 0,
    weighted_score numeric(3,2),
    updated_at     timestamptz not null default now()
);

create table public.album_aggregates (
    album_id            uuid primary key references public.albums (id) on delete cascade,
    track_derived_score numeric(3,2),
    direct_album_score  numeric(3,2),
    direct_rating_count int not null default 0,
    updated_at          timestamptz not null default now()
);

-- updated_at maintenance ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger ratings_set_updated_at
    before update on public.ratings
    for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------
-- Catalog and aggregate tables are written by Edge Functions using the
-- service-role key, which bypasses RLS — so they need only read policies.
alter table public.users            enable row level security;
alter table public.follows          enable row level security;
alter table public.albums           enable row level security;
alter table public.tracks           enable row level security;
alter table public.ratings          enable row level security;
alter table public.listen_events    enable row level security;
alter table public.track_aggregates enable row level security;
alter table public.album_aggregates enable row level security;

-- users: world-readable; a user manages only their own row.
create policy "users are world-readable"
    on public.users for select using (true);
create policy "users insert own row"
    on public.users for insert with check (id = auth.uid());
create policy "users update own row"
    on public.users for update using (id = auth.uid()) with check (id = auth.uid());

-- follows: a user reads and writes only their own follow edges.
create policy "follows readable by follower"
    on public.follows for select using (follower_id = auth.uid());
create policy "follows insert own"
    on public.follows for insert with check (follower_id = auth.uid());
create policy "follows delete own"
    on public.follows for delete using (follower_id = auth.uid());

-- albums / tracks: world-readable.
create policy "albums are world-readable"
    on public.albums for select using (true);
create policy "tracks are world-readable"
    on public.tracks for select using (true);

-- ratings: world-readable; a user writes only their own ratings.
create policy "ratings are world-readable"
    on public.ratings for select using (true);
create policy "ratings insert own"
    on public.ratings for insert with check (user_id = auth.uid());
create policy "ratings update own"
    on public.ratings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ratings delete own"
    on public.ratings for delete using (user_id = auth.uid());

-- listen_events: private to the owner; written by the Last.fm sync function.
create policy "listen_events readable by owner"
    on public.listen_events for select using (user_id = auth.uid());

-- aggregates: world-readable.
create policy "track_aggregates are world-readable"
    on public.track_aggregates for select using (true);
create policy "album_aggregates are world-readable"
    on public.album_aggregates for select using (true);
