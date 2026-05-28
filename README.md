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

**All MVP milestones (M0–M8) are implemented on the web client**, against the AWS backend:
onboarding, now-playing, rate & review, the scoring algorithm + album pages, library
(search/filter/sort), friends + feed + profiles, data export (CSV/JSON), and a reliability
pass (theme system, error boundary, branded 404). The UI follows the Encore Design System
exported from Claude Design.

Not yet done: a production AWS deploy (run locally meanwhile — see
[`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md)), a mobile-responsive sidebar, and global
album/artist search.

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

### Run locally (no AWS account)

The whole stack runs on your laptop: Postgres in Docker, the API as a Node
server, the web app via `next dev`, and a "Sign in as dev" shortcut that
bypasses Cognito. See [`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md) for the
~3-minute setup.

### Deploy to AWS

When you're ready for a public URL, [`infra/DEPLOY.md`](infra/DEPLOY.md)
walks you through provisioning RDS + Cognito + Lambda + API Gateway +
Amplify Hosting with Terraform.

## Conventions

See [`CLAUDE.md`](CLAUDE.md) for engineering conventions (Section 11 of the build spec, adapted
to the web platform).
