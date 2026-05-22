# Encore

> *Music worth playing again.*

Encore is an iOS app for rating music. Rate what you're listening to in one tap, build a personal
library of your taste, watch song ratings roll up into honest album scores, and see what your
friends rate.

The full product and technical spec lives in [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md).

## Status

**Milestone 0 — Foundations.** Repo, Xcode project, the `DesignSystem/`, Codable models, a branded
placeholder home screen, the AWS infrastructure (Terraform), and the PostgreSQL schema.

Remaining milestones: M1 Onboarding · M2 Now-playing · M3 Rate & review · M4 Catalog & album
pages · M5 Library · M6 Friends · M7 Data export · M8 Reliability & beta.

## Stack

- **iOS client** — Swift 5.9+, SwiftUI, iOS 17+, MVVM, async/await. Swift Package Manager only.
- **Backend** — AWS: RDS for PostgreSQL, an API Lambda (TypeScript/Node) behind API Gateway,
  Amazon Cognito for auth (Sign in with Apple). Infrastructure as Terraform.
- **Listening capture** — Last.fm `user.getRecentTracks` (proxied server-side).
- **Catalog** — MusicBrainz + Cover Art Archive (proxied and cached server-side).

> **Backend deviates from the build spec.** `docs/BUILD_SPEC.md` defaults to Supabase. The project
> instead runs on AWS at Jake's direction. The relational schema (build spec Section 5) and the
> scoring algorithm (Section 6) carry over unchanged; Supabase Edge Functions become Lambda
> functions, Supabase Auth becomes Cognito, and Row-Level Security is replaced by API-layer
> authorization (the iOS app never connects to the database directly).

## Repository layout

```
Encore.xcodeproj/     iOS app project (Xcode 16+, file-system-synchronized groups)
Encore/               iOS app sources
  EncoreApp.swift     App entry point
  Core/               Models · Networking · Services
  Features/           One folder per screen (MVVM)
  DesignSystem/       Color · Typography · StarRating · EncoreButton · Card · DoubleRule
  Resources/          Fonts · Assets.xcassets · Info.plist
api/                  Backend API — TypeScript Lambda · SQL migrations
infra/                AWS infrastructure as Terraform
docs/BUILD_SPEC.md    Source of truth (original brief)
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

### Backend (AWS)

1. Build the API bundle: `cd api && npm install && npm run build`.
2. Provision infrastructure: `cd infra`, copy `terraform.tfvars.example` to `terraform.tfvars`,
   then `terraform init && terraform apply`. See `infra/README.md`.
3. Apply the schema migration in `api/migrations/` against the RDS instance (see `api/README.md`).
4. Copy `.env.example` to `.env` and fill the iOS client values from `terraform output`.
   Database credentials and third-party keys live in AWS Secrets Manager — never committed, never
   shipped in the app binary.

## Conventions

See [`CLAUDE.md`](CLAUDE.md) for engineering conventions (Section 11 of the build spec).
