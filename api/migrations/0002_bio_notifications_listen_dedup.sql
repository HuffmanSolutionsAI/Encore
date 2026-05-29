-- 0002: bio + notifications + listen-event de-dup
-- Supports profile editing (M9-ish polish), the notifications surface,
-- and the Last.fm history backfill (sync without inserting duplicates).

alter table users add column bio text;

-- A natural-key index that lets `insert ... on conflict do nothing` dedupe
-- the Last.fm history sync. Same user + same track + same played_at is the
-- same scrobble. Match on (track_title, artist_name) since Last.fm doesn't
-- always populate track_mbid.
create unique index if not exists listen_events_user_played_idx
    on listen_events (user_id, played_at, track_title, artist_name);

-- Notifications — user-scoped, kind + jsonb payload, read tracking.
create table notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users (id) on delete cascade,
    kind       text not null check (kind in ('follow', 'ovation')),
    actor_id   uuid references users (id) on delete cascade,
    payload    jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    read_at    timestamptz
);
create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_user_unread_idx on notifications (user_id) where read_at is null;
