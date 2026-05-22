# Encore

A music-rating app for iOS. *Music worth playing again.*

See `docs/BUILD_SPEC.md` for the full product and technical spec.

---

## Engineering conventions

- **Platform:** iOS 17+, Swift 5.9+, SwiftUI, MVVM. Swift Package Manager only.
- **Backend:** Supabase (Postgres + Auth + Edge Functions in TypeScript/Deno).
- **State:** `@Observable` view models; one per screen. Keep views thin.
- **Networking:** async/await; a single typed API client; no networking in views.
- **Secrets:** never commit keys; all third-party keys live in Edge Function env vars, never in the
  app binary. Use a `.env.example` and keep real values out of git.
- **Dependencies:** minimal. Do not add a package without flagging it first. Supabase Swift SDK is
  fine; avoid large UI frameworks — build components in `DesignSystem/`.
- **Design:** use only the tokens in Section 8 of the build spec. No off-brand colors. Fraunces for
  display, Inter for UI. Support light + dark mode.
- **Testing:** unit tests for the scoring algorithm (Section 6) and all services; the scoring math
  must have thorough coverage. Aim for testable, dependency-injected services.
- **Reliability first:** every network call has loading, empty, and error states. Never lose user
  data. The app degrades gracefully when a third party is down.
- **Git:** small, focused commits with clear messages; one branch per milestone.
- **Work style:** smallest vertical slice first; confirm a milestone's acceptance criteria before
  starting the next; ask before changing the stack or scope.

## Project layout

```
Encore.xcodeproj      # iOS app project (Xcode 16+, file-system-synchronized groups)
Encore/               # iOS app sources
  EncoreApp.swift
  Core/               # Models, Networking, Services
  Features/           # One folder per screen (MVVM)
  DesignSystem/       # Color, Typography, StarRating, EncoreButton, Card, DoubleRule
  Resources/          # Fonts + Assets.xcassets
supabase/             # Postgres migrations, Edge Functions, config
docs/BUILD_SPEC.md    # Source of truth
```

## Milestones

Build in order; each ends shippable. Current: **M0 — Foundations**.
M0 · M1 Onboarding · M2 Now-playing · M3 Rate & review · M4 Catalog & album pages ·
M5 Library · M6 Friends · M7 Data export · M8 Reliability & beta.
