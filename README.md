# Encore

> *Music worth playing again.*

Encore is an iOS app for rating music. Rate what you're listening to in one tap, build a personal
library of your taste, watch song ratings roll up into honest album scores, and see what your
friends rate.

The full product and technical spec lives in [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md).

## Status

**Milestone 0 — Foundations.** Repo, Xcode project, the `DesignSystem/`, model and service
scaffolding, a branded placeholder home screen, and the Supabase Postgres schema with RLS.

Remaining milestones: M1 Onboarding · M2 Now-playing · M3 Rate & review · M4 Catalog & album
pages · M5 Library · M6 Friends · M7 Data export · M8 Reliability & beta.

## Stack

- **iOS client** — Swift 5.9+, SwiftUI, iOS 17+, MVVM, async/await. Swift Package Manager only.
- **Backend** — Supabase (managed Postgres, Auth, Storage, Edge Functions, `pg_cron`).
- **Listening capture** — Last.fm `user.getRecentTracks` (proxied server-side).
- **Catalog** — MusicBrainz + Cover Art Archive (proxied and cached server-side).

## Repository layout

```
Encore.xcodeproj/     iOS app project (Xcode 16+, file-system-synchronized groups)
Encore/               iOS app sources
  EncoreApp.swift     App entry point
  Core/               Models · Networking · Services
  Features/           One folder per screen (MVVM)
  DesignSystem/       Color · Typography · StarRating · EncoreButton · Card · DoubleRule
  Resources/          Fonts · Assets.xcassets · Info.plist
supabase/             Postgres migrations · Edge Functions · config
docs/BUILD_SPEC.md    Source of truth
```

## Getting started

### iOS app

1. Open `Encore.xcodeproj` in **Xcode 16 or newer**.
2. Drop the Fraunces and Inter font files into `Encore/Resources/Fonts/` — see
   [`Encore/Resources/Fonts/README.md`](Encore/Resources/Fonts/README.md). The app falls back to
   system fonts if they are absent, so it still builds without them.
3. Select an iOS 17+ simulator and run.

> The Xcode project was authored without Xcode in this environment. If the project fails to open,
> verify `Encore.xcodeproj/project.pbxproj` against a freshly generated SwiftUI app target.

### Backend (Supabase)

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase start`, or
   create a hosted project.
2. Apply the schema: `supabase db push` (migrations live in `supabase/migrations/`).
3. Copy `.env.example` to `.env` and fill in values. Third-party keys are set as Edge Function
   secrets, never committed and never shipped in the app binary.

## Conventions

See [`CLAUDE.md`](CLAUDE.md) for engineering conventions (Section 11 of the build spec).
