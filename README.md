# Encore

> *Music worth playing again.*

Encore is a web app for rating music. Rate what you're listening to in one tap, build a personal
library of your taste, watch song ratings roll up into honest album scores, and see what your
friends rate.

The full product and feature spec lives in [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md).

## Platform pivot — web first

The MVP was originally specced as a native iOS app. On May 26 2026 the target moved to a web app
because shipping iOS is blocked on tools the founder doesn't have right now (Xcode, an Apple
Developer account). **The feature scope is unchanged** — the build spec, schema, and scoring
algorithm carry over verbatim. Only the client platform is different.

The original SwiftUI work is **parked** under `Encore/` and `Encore.xcodeproj/`. It remains a
reasonable starting point for a future iOS port: the AWS backend the web app talks to is the
same one the iOS app was talking to.

## Status

**Milestone 0 — Foundations (web)** in progress: Next.js 15 + Tailwind scaffold with the brand
design system. Backend (M0–M4 worth of Lambda + RDS work) is already on trunk.

Remaining milestones: M1 Onboarding · M2 Now-playing · M3 Rate & review · M4 Catalog & album
pages · M5 Library · M6 Friends · M7 Data export · M8 Reliability & beta.

## Stack

- **Web client** — Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS.
- **Hosting** — AWS Amplify Hosting (stays inside the existing AWS account).
- **Backend** — AWS: RDS for PostgreSQL, an API Lambda (TypeScript/Node) behind API Gateway,
  Amazon Cognito for auth (Sign in with Apple). Infrastructure as Terraform.
- **Listening capture** — Last.fm `user.getRecentTracks` (proxied server-side).
- **Catalog** — MusicBrainz + Cover Art Archive (proxied and cached server-side).

> **Backend deviates from the build spec.** `docs/BUILD_SPEC.md` defaults to Supabase. The project
> instead runs on AWS at Jake's direction. The relational schema (build spec Section 5) and the
> scoring algorithm (Section 6) carry over unchanged; Supabase Edge Functions become Lambda
> functions, Supabase Auth becomes Cognito, and Row-Level Security is replaced by API-layer
> authorization (the client never connects to the database directly).

## Repository layout

```
web/                  Next.js 15 web app
  app/                Routes (App Router)
  components/         Design system + feature components
  lib/                API client, auth, hooks
api/                  Backend API — TypeScript Lambda · SQL migrations
infra/                AWS infrastructure as Terraform
docs/BUILD_SPEC.md    Source of truth (original brief)

Encore.xcodeproj/     Parked — original iOS Xcode project
Encore/               Parked — original SwiftUI sources
EncoreTests/          Parked — original XCTest sources
```

## Getting started

### Web app

```sh
cd web
cp .env.local.example .env.local      # fill from `terraform output`
npm install
npm run dev                            # http://localhost:3000
```

### Backend (AWS)

1. Build the API bundle: `cd api && npm install && npm run build`.
2. Provision infrastructure: `cd infra`, copy `terraform.tfvars.example` to `terraform.tfvars`,
   then `terraform init && terraform apply`. See `infra/README.md`.
3. Apply the schema migration in `api/migrations/` against the RDS instance (see `api/README.md`).
4. Take the `terraform output` values into `web/.env.local`. Database credentials and third-party
   keys live in AWS Secrets Manager — never committed, never shipped to the browser.

## Conventions

See [`CLAUDE.md`](CLAUDE.md) for engineering conventions (Section 11 of the build spec, adapted
to the web platform).
