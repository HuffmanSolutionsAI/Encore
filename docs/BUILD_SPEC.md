# Encore — Build Specification

**A music-rating app. Build brief for Claude Code.**
Version 1.0 · May 22, 2026 · Prepared for Jake, Huffman AI Solutions

---

## 0. How to use this document

This is the build spec for **Encore**, an iOS music-rating app. Hand it to Claude Code as the
source of truth for the MVP.

Recommended setup:

1. Create a new git repo for the project.
2. Save this file in the repo as `docs/BUILD_SPEC.md`.
3. Create a `CLAUDE.md` in the repo root and copy **Section 11 (Engineering Conventions)** into it,
   plus a one-line pointer: `See docs/BUILD_SPEC.md for the full product and technical spec.`
4. Tell Claude Code to read `docs/BUILD_SPEC.md`, then start at **Milestone 0 (Section 10)**.

Build the MVP only. Anything marked *Phase 2* or *Non-goal* is explicitly out of scope for now.
Work in vertical slices, smallest shippable thing first. Ask before introducing a dependency or a
service not named here.

---

## 1. Product summary

**Encore** is a mobile app for rating music. You rate what you are listening to in a single tap,
those ratings build a personal library of your taste, song ratings roll up into an honest score for
every album, you see what your friends rate, and (later) you get recommendations.

- **Brand line:** *Music worth playing again.*
- **In-product rating prompt:** *Worth an encore?*
- **Target user:** the "music logger" — someone who already follows new releases and likes having
  opinions about music. Skews iOS, 20s–30s.
- **Market context:** the category leader (Musicboard) is collapsing on reliability. Encore's
  promise is the opposite — **trustworthy, reliable, and built to last.** Reliability and not losing
  a user's data are first-class product requirements, not afterthoughts.

### The core loop

> Listen on Spotify → see it as "now playing" → rate it in one tap → songs roll up into album
> scores → browse your library → see friends' ratings → *(Phase 2)* get recommendations.

Every MVP feature serves this loop.

---

## 2. Scope

### 2.1 MVP — build this

| # | Feature | One-line definition |
|---|---------|---------------------|
| 1 | **Onboarding & connect** | Sign in with Apple; link a Last.fm account; link Spotify→Last.fm. |
| 2 | **Now-playing screen** | Live display of the current track with a one-tap rate action. |
| 3 | **Rate & review** | 5-star half-step ratings for songs *and* albums; optional review; first-listen flag. |
| 4 | **Album aggregate score** | Album scores computed bottom-up from song ratings, with highlights & skips. |
| 5 | **Ratings library** | A browsable, searchable, filterable grid of everything the user has rated. |
| 6 | **Album pages** | Aggregate score, tracklist, reviews, and friends' ratings per album. |
| 7 | **Friends & feed** | Profiles, following, and a feed of friends' recent ratings. |
| 8 | **Data export** | One-tap export of the user's full ratings history (CSV + JSON). |

### 2.2 Phase 2 — do NOT build yet

Android app · direct Spotify Web API capture · direct Apple Music (MusicKit) capture · the AI layer
(taste profiles, AI review digests, the friend-sourced recommendation engine) · user-made lists ·
push notifications beyond a basic stub.

### 2.3 Non-goals (MVP)

No algorithmic discovery feed. No in-app music playback (Encore never plays audio — it reads what
Spotify is playing). No social features beyond follow + feed (no comments, DMs, or likes in MVP).
No web app.

---

## 3. Tech stack

Keep it conventional and managed. Reliability is the brand — do not hand-roll infrastructure.

| Layer | Choice | Notes |
|-------|--------|-------|
| **iOS client** | Swift 5.9+, SwiftUI, **iOS 17+** | MVVM. async/await + URLSession. Swift Package Manager. |
| **Backend / DB** | **Supabase** (managed Postgres, Auth, Storage, Row-Level Security) | Managed = uptime by default. |
| **Server logic** | Supabase **Edge Functions** (TypeScript/Deno) | Last.fm sync, catalog proxy, score recompute. |
| **Scheduled jobs** | Supabase `pg_cron` | Periodic Last.fm sync; aggregate recompute. |
| **Auth** | Supabase Auth — **Sign in with Apple** (primary), email fallback | |
| **Catalog metadata** | **MusicBrainz API** | Cached into our Postgres. Cover Art Archive for artwork. |
| **Listening capture** | **Last.fm API** | `user.getRecentTracks` for now-playing + scrobbles. |

If Supabase is not desired, the equivalent is a Node/TypeScript API + managed Postgres on a managed
host — but **default to Supabase** for MVP speed. Flag the choice to Jake before changing it.

**Hard rule:** all third-party API keys (Last.fm, etc.) live server-side only — in Edge Function
environment variables. Never ship an API key in the iOS binary.

---

## 4. Architecture

### 4.1 How "now playing" works (the key design)

There is no App-Store-safe way for an iOS app to read what Spotify is playing on-device. Encore
captures listening through **Last.fm** instead:

1. In onboarding, the user links their Spotify account to Last.fm (a one-time toggle inside
   Spotify's own settings) and tells Encore their Last.fm username.
2. From then on, every track they play on Spotify is reported to Last.fm.
3. Last.fm's `user.getRecentTracks` returns the currently-playing track flagged
   `nowplaying="true"` (sent the moment a track starts) and durable "scrobbles" (recorded once a
   track is ~halfway played).
4. Our backend polls Last.fm; the iOS app reads now-playing from **our** backend, never Last.fm
   directly.

This means now-playing is **near-real-time** (the now-playing flag is fast; only the permanent
play record lags slightly). Good enough to show what's on and let the user rate it.

The same bridge also covers Apple Music, Tidal, Deezer, and YouTube users if they scrobble — no
extra work.

### 4.2 Data flow

```
Spotify app ──scrobbles──▶ Last.fm
                              │
              (poll: Edge Function, every ~30s for active users
               + pg_cron backfill)
                              ▼
                      Supabase Postgres
              (listen_events, ratings, aggregates, catalog cache)
                              ▲
                     REST / Supabase client
                              │
                        iOS app (SwiftUI)
```

- The iOS app talks to **our backend only** (Supabase + Edge Functions). It never calls Last.fm or
  MusicBrainz directly.
- Catalog lookups (MusicBrainz) are proxied and cached by an Edge Function so we respect
  MusicBrainz's rate limit (~1 request/second) and never refetch known data.
- Score aggregates are recomputed server-side when ratings change (see Section 6).

### 4.3 iOS project structure

```
Encore/
  EncoreApp.swift
  Core/
    Models/          # Codable structs: Track, Album, Rating, UserProfile, ...
    Networking/      # API client (Supabase), endpoints
    Services/        # AuthService, NowPlayingService, RatingService, CatalogService
  Features/
    Onboarding/
    NowPlaying/
    Rating/
    Library/
    Album/
    Friends/
  DesignSystem/      # Color+Encore, Typography, StarRating, EncoreButton, Card
  Resources/         # Fraunces + Inter font files, Assets.xcassets
  Preview Content/
EncoreTests/
EncoreUITests/
```

---

## 5. Data model

Postgres tables. `users` is the app profile; Supabase `auth.users` handles credentials.

| Table | Key fields |
|-------|-----------|
| **users** | `id` (pk, = auth uid), `handle` (unique), `display_name`, `avatar_url`, `lastfm_username`, `created_at` |
| **follows** | `follower_id` (fk users), `followee_id` (fk users), `created_at` — PK (follower, followee) |
| **albums** | `id` (pk), `mbid` (MusicBrainz release-group id, unique), `title`, `artist_name`, `artist_mbid`, `release_year`, `artwork_url`, `track_count`, `created_at` |
| **tracks** | `id` (pk), `mbid` (unique), `album_id` (fk albums), `title`, `track_number`, `duration_ms` |
| **ratings** | `id` (pk), `user_id` (fk), `subject_type` (`'track'`\|`'album'`), `subject_id`, `score` (numeric 0.5–5.0, step 0.5, **nullable** — review without a score is allowed), `review_text` (nullable), `is_relisten` (bool), `source` (`'now_playing'`\|`'manual'`), `created_at`, `updated_at` — **unique (user_id, subject_type, subject_id)** |
| **listen_events** | `id` (pk), `user_id` (fk), `track_title`, `artist_name`, `track_mbid` (nullable), `played_at`, `source` (`'lastfm'`), `created_at` |
| **track_aggregates** | `track_id` (pk, fk), `avg_score`, `rating_count`, `weighted_score`, `updated_at` |
| **album_aggregates** | `album_id` (pk, fk), `track_derived_score`, `direct_album_score`, `direct_rating_count`, `updated_at` |

Phase 2 adds `taste_profiles`. Do not create it yet.

**Row-Level Security:** enable RLS on every table. A user may read/write only their own `ratings`,
`follows`, and `users` row; `ratings`, `users`, `albums`, `tracks`, and the aggregate tables are
world-readable (a user can see friends' ratings and any album). Lock writes to the owner.

---

## 6. The album scoring algorithm

This is the heart of feature #4. Implement it exactly.

**Step 1 — track score.** Each track has a crowd score: the average of all user ratings for that
track. To keep low-volume tracks honest, use a Bayesian-weighted average:

```
weighted_track_score = (C * m + sum_of_track_ratings) / (C + n)

  n = number of ratings for the track
  C = smoothing constant = 5
  m = global mean of all track ratings (default 3.5 until there is enough data)
```

**Step 2 — album aggregate (`track_derived_score`).** The mean of `weighted_track_score` across
the album's tracks that have at least one rating. If no track on the album has a rating, the album
score is `null`. Each track counts equally.

**Step 3 — direct album score.** Albums can also be rated as a whole. Store that separately as
`direct_album_score` (average of direct album ratings). On the album page, **lead with
`track_derived_score`**; show the direct score beside it as a secondary number.

**Personal album score** (shown on a user's own album view): the simple mean of *that user's* track
ratings for the album, plus a coverage indicator:

```
coverage = (tracks the user has rated on this album) / album.track_count
display e.g. "based on 7 of 11 tracks"
```

**Highlights & skips.** The album page shows the highest- and lowest-`weighted_track_score` tracks
on the album — these fall straight out of the data, no extra modelling.

**Recompute trigger.** When a rating is inserted or updated, recompute the affected
`track_aggregates` row and the parent `album_aggregates` row. Do this in a Postgres function /
trigger or an Edge Function — not on the client.

---

## 7. Feature specs & acceptance criteria

### F1 — Onboarding & connect
Sign in with Apple. Then a short flow: pick a unique `handle`; enter Last.fm username; a screen that
explains and deep-links to Spotify's "connect to Last.fm" setting.
**Done when:** a new user can sign in, set a handle, save a Last.fm username, and reach the home
screen. The app verifies the Last.fm username exists (one test API call) before accepting it.

### F2 — Now-playing screen
The home screen. Shows the current track — artwork, title, album, artist — read from our
`/now-playing` endpoint, refreshed every ~20–30s while foregrounded. A persistent "Worth an
encore?" rate control sits on the now-playing card. Graceful empty state when nothing is playing.
**Done when:** playing a song on Spotify shows it in Encore within ~30s, and the rate control opens
the rating sheet pre-filled with that track.

### F3 — Rate & review
A rating sheet: 5-star scale, **half-star steps**, for a **song or an album**. Optional review text.
A "first listen / relisten" toggle. **The star rating is optional** — a review with no stars is
valid. Re-rating updates the existing rating (no duplicates).
**Done when:** a user can rate a song and an album, with/without a review, with/without stars; the
rating persists and appears in their library.

### F4 — Album aggregate score
Implement Section 6. Aggregates recompute server-side on every rating change.
**Done when:** rating songs on an album produces a correct `track_derived_score`, a correct
personal score with coverage text, and correct highlight/skip tracks.

### F5 — Ratings library
A fast, browsable grid of everything the user has rated. **Searchable** by title/artist. Filter by
score, by date, by song-vs-album, by first-listen-vs-relisten. Sort by date or score.
**Done when:** a user with 50+ ratings can find any one of them in a couple of taps.

### F6 — Album pages
Per-album page: cover, title, artist, year; the aggregate score (lead) and direct score
(secondary); the tracklist with per-track scores; highlights & skips; reviews; and **how the user's
friends rated it**, surfaced separately from the global average.
**Done when:** every album in the catalog has a complete, correct page.

### F7 — Friends & feed
Public profiles (handle, display name, avatar, rating count). Follow / unfollow. A feed of recent
ratings from followed users. Find users by handle.
**Done when:** a user can follow another, and that user's new ratings appear in the feed.

### F8 — Data export
A settings action that exports the user's full ratings history as **CSV and JSON**. This is the
brand's trust promise — make it obvious and reliable.
**Done when:** export produces a complete, well-formed file the user can save/share.

---

## 8. Brand & design system

Encore's full brand book is the companion file `Encore_Brand_Guidelines.html`. The essentials for
the build:

### 8.1 Color tokens

| Token | Hex | Use |
|-------|-----|-----|
| Ink | `#211B14` | Primary text |
| Paper | `#F4EDDF` | App background |
| Cocoa | `#3D2F22` | Primary brand color — logo, headings, primary buttons, app icon |
| Cocoa Deep | `#241A12` | Pressed/hover state of Cocoa elements |
| Brass | `#B98C3F` | Ratings (stars) and earned highlights only — never body text |
| Surface | `#FBF7EC` | Cards, raised surfaces |
| Dust | `#DCCFB2` | Hairlines, borders, dividers, empty stars |
| Night | `#1B1712` | Dark-mode background |
| Night Surface | `#2A231C` | Dark-mode cards |
| Clay | `#8C6A47` | Dark-mode accent (lifted Cocoa) |

### 8.2 Typography

- **Display — Fraunces** (SemiBold/600 for the wordmark, headings, album & artist titles, big score
  numbers). Never below 19pt.
- **Text & UI — Inter** (400/500/600/700 for all interface text, body, labels, buttons, captions).

Bundle both fonts in `Resources/` (both are SIL Open Font License). Register them via
`Info.plist` (`UIAppFonts`).

### 8.3 Key components to build in `DesignSystem/`

- **StarRating** — 5 stars, brass when filled, Dust when empty, half-star support; read-only and
  interactive variants.
- **EncoreButton** — primary (Cocoa fill, Paper text), secondary (Ink outline), brass (the rating
  CTA only).
- **Card** — Surface fill, Dust 1px border, ~13pt corner radius.
- **DoubleRule** — two thin brass lines; the brand's section divider.
- Light and dark mode both supported from the start.

### 8.4 Voice

UI copy is considered, literate, warm, quietly confident — never hype or slang. Examples: empty
library → *"Nothing in here yet. Rate the last song that stopped you in your tracks."* A five-star
confirmation → *"Bravo. That's an encore."* Error → *"We've lost the signal for a moment. Your
ratings are safe — try again shortly."*

---

## 9. External APIs — integration notes

### Last.fm (`https://ws.audioscrobbler.com/2.0/`)
- `user.getRecentTracks` — returns recent tracks; the current one is flagged `nowplaying="true"`.
  No user auth needed for this read; just an API key + the username.
- For MVP, the user simply provides their Last.fm username (a public read). Full Last.fm
  web-auth can come later.
- Backend polls per active user; cache aggressively; respect rate limits.

### MusicBrainz (`https://musicbrainz.org/ws/2/`)
- Source of album/track metadata. **Rate limit ~1 request/second** — you must throttle and cache
  every result into our `albums`/`tracks` tables. Set a descriptive `User-Agent` (required).
- Artwork via the **Cover Art Archive**.

### Reliability rules
- Treat every third-party call as fallible: timeouts, retries with backoff, cached fallbacks.
- The app must stay useful if Last.fm is briefly down (manual rating always works).
- Never block the UI on a third-party call.

---

## 10. Build plan — milestones

Build in this order. Each milestone should end shippable and demoable.

- **M0 — Foundations.** Git repo, Xcode project (iOS 17, SwiftUI), Supabase project, the
  `DesignSystem/` (colors, fonts, StarRating, EncoreButton, Card), and the Postgres schema from
  Section 5 with RLS. *Done: app builds, shows a branded placeholder home screen.*
- **M1 — Onboarding (F1).** Sign in with Apple, handle, Last.fm username, Spotify-link explainer.
- **M2 — Now-playing (F2).** `/now-playing` Edge Function (Last.fm proxy); the now-playing screen.
- **M3 — Rate & review (F3).** Rating sheet, `ratings` table, persistence. → **This is the first
  vertical slice: connect → see now playing → rate it → it's saved. Get this rock-solid before
  moving on.**
- **M4 — Catalog & album pages (F4, F6).** MusicBrainz proxy + cache, the scoring service
  (Section 6), album pages.
- **M5 — Library (F5).** Browse, search, filter, sort.
- **M6 — Friends (F7).** Profiles, follow, activity feed.
- **M7 — Data export (F8).**
- **M8 — Reliability & beta.** Error/empty/offline states everywhere, a status check, crash-free
  pass, then a TestFlight build.

**MVP definition of done:** all 8 features pass their acceptance criteria; the core loop works
end-to-end on a real device with a real Spotify+Last.fm account; data export produces a complete
file; light and dark mode both correct; no known data-loss path.

---

## 11. Engineering conventions

*(Copy this section into `CLAUDE.md`.)*

- **Platform:** iOS 17+, Swift 5.9+, SwiftUI, MVVM. Swift Package Manager only.
- **Backend:** Supabase (Postgres + Auth + Edge Functions in TypeScript/Deno).
- **State:** `@Observable` view models; one per screen. Keep views thin.
- **Networking:** async/await; a single typed API client; no networking in views.
- **Secrets:** never commit keys; all third-party keys live in Edge Function env vars, never in the
  app binary. Use a `.env.example` and keep real values out of git.
- **Dependencies:** minimal. Do not add a package without flagging it first. Supabase Swift SDK is
  fine; avoid large UI frameworks — build components in `DesignSystem/`.
- **Design:** use only the tokens in Section 8. No off-brand colors. Fraunces for display, Inter for
  UI. Support light + dark mode.
- **Testing:** unit tests for the scoring algorithm (Section 6) and all services; the scoring math
  must have thorough coverage. Aim for testable, dependency-injected services.
- **Reliability first:** every network call has loading, empty, and error states. Never lose user
  data. The app degrades gracefully when a third party is down.
- **Git:** small, focused commits with clear messages; one branch per milestone.
- **Work style:** smallest vertical slice first; confirm a milestone's acceptance criteria before
  starting the next; ask before changing the stack or scope.

---

## 12. Open decisions (not blockers for building)

These need a human decision but do not block the MVP build:

- **Name clearance.** "Encore" is a working name pending trademark + domain checks in the
  music/software class. Build under it; keep the name easy to change (centralize it).
- **Monetization.** Out of MVP scope. Likely free with a later paid tier — does not affect the
  build now.
- **Backend host detail** (if not Supabase) — confirm with Jake before deviating.

---

*End of build specification. Companion files: `Music_Rating_App_Market_Research_and_Plan.docx`
(full product plan & rationale) and `Encore_Brand_Guidelines.html` (complete brand system).*
