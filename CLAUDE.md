# Encore

A music-rating web app. *Music worth playing again.*

See `docs/BUILD_SPEC.md` for the full product and feature spec.

> **Platform pivot (May 26 2026).** The MVP target moved from native iOS to a web app —
> the founder doesn't have Xcode or an Apple Developer account, so iOS shipping is blocked.
> The product/feature requirements in the build spec still apply; only the client platform
> changed. The original SwiftUI iOS work (M1–M4) is parked under `Encore/` and
> `Encore.xcodeproj/` as a reference for a future iOS port. See README.md.

---

## Engineering conventions

- **Platform:** Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS.
- **Backend:** AWS — RDS PostgreSQL, an API Lambda (TypeScript/Node) behind API Gateway, Cognito
  auth (Sign in with Apple). Infrastructure as Terraform. *This deviates from the build spec, which
  defaults to Supabase — the change was approved by Jake. See README.md.*
- **Authorization:** the web app calls API Gateway only; the API Lambda verifies the Cognito JWT
  and enforces per-user ownership. No Postgres Row-Level Security on this stack.
- **State:** lightweight — React hooks + a session context. No Redux/Zustand unless we have a
  concrete reason. Server-state lives in Server Components where possible; client-state stays
  small and local.
- **Networking:** a single typed `fetch` wrapper that attaches the Cognito access token. No
  fetching from inside JSX — call from a Server Component, a route handler, or a small client
  hook that owns the loading/empty/error states.
- **Secrets:** never commit keys; database credentials and third-party keys live in AWS Secrets
  Manager. The web app has only public-by-design values (Cognito client id, Cognito domain,
  API base URL) in `NEXT_PUBLIC_*` env vars.
- **Dependencies:** minimal. Do not add a package without flagging it first. Build UI atoms in
  `web/components/design-system/` rather than pulling in a kitchen-sink UI library.
- **Design:** use only the brand tokens (build spec Section 8). Fraunces for display, Inter for
  UI. Support light + dark mode.
- **Testing:** unit tests for the scoring algorithm (Section 6) and all pure helpers; the scoring
  math must have thorough coverage. Vitest for both the API and the web app.
- **Reliability first:** every network call has loading, empty, and error states. Never lose
  user data. The app degrades gracefully when a third party is down.
- **Git:** small, focused commits with clear messages; one branch per milestone.
- **Work style:** smallest vertical slice first; confirm a milestone's acceptance criteria
  before starting the next; ask before changing the stack or scope.

## Project layout

```
web/                  # Next.js 15 App Router web app
  app/                # Routes (App Router)
  components/         # Design system + feature components
  lib/                # API client, auth, hooks
api/                  # Backend API — TypeScript Lambda + SQL migrations
infra/                # AWS infrastructure as Terraform (incl. Amplify Hosting)
docs/BUILD_SPEC.md    # Source of truth (original product brief)

Encore.xcodeproj/     # Parked — original iOS Xcode project
Encore/               # Parked — original SwiftUI sources
EncoreTests/          # Parked — original XCTest sources
```

## Milestones (web target)

Build in order; each ends shippable. The feature scope mirrors the original iOS milestones —
only the client platform has changed.

M0 Foundations · M1 Onboarding · M2 Now-playing · M3 Rate & review · M4 Catalog & album pages ·
M5 Library · M6 Friends · M7 Data export · M8 Reliability & beta — **all implemented on the web
client.** The UI follows the Encore Design System (Claude Design handoff): editorial "printed
page" aesthetic, sidebar shell, persistent now-playing bar, brass reserved for scores/stars and
the single album rate CTA.

Remaining before a real beta: stand up AWS (or run locally — see `docs/LOCAL_DEV.md`), a
mobile-responsive pass on the sidebar shell, and global album/artist search (the sidebar
"Search" item is still parked).
