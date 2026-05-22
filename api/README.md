# Encore API

The backend API for Encore — a TypeScript handler that runs on AWS Lambda
behind API Gateway (HTTP API). See `../infra/` for the infrastructure and the
build spec Sections 3–6 for the architecture.

## Layout

```
src/handler.ts     Lambda entry point and route table
src/routes/        Route handlers grouped by resource
src/lib/           Shared helpers — db pool, secrets, auth, HTTP, Last.fm
migrations/        Versioned SQL migrations — the source of truth for the schema
```

## Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /health` | public | Liveness check |
| `GET /users/me` | JWT | Fetch the caller's profile (404 before onboarding) |
| `POST /users` | JWT | Create the caller's profile — `handle`, `display_name` |
| `PATCH /users/me` | JWT | Update mutable fields, e.g. `lastfm_username` |
| `GET /lastfm/verify?username=` | JWT | Confirm a Last.fm username exists |

## Build

The Lambda deployment bundle must be built before `terraform apply`:

```sh
npm install
npm run build        # bundles src/handler.ts -> dist/handler.js
npm run typecheck    # tsc --noEmit
```

Terraform zips `dist/` into the Lambda package (see `../infra/lambda.tf`).

## Database migrations

Migrations are plain SQL, applied in filename order against the RDS instance.
The connection details live in Secrets Manager (`encore-<env>/database`).

```sh
psql "$DATABASE_URL" -f migrations/0001_initial_schema.sql
```

The RDS instance is not publicly accessible. For local migration work, reach it
through a bastion host or an SSM port-forwarding session inside the VPC.

| File | Contents |
|------|----------|
| `0001_initial_schema.sql` | All eight tables from build spec Section 5, indexes, and the `updated_at` trigger. |

Still to come:

- **M2** — `/now-playing` (Last.fm proxy) and the now-playing screen.
- **M4** — the scoring functions and recompute triggers (build spec Section 6).
- Later milestones — the catalog proxy, the Last.fm sync job
  (EventBridge-scheduled), and the remaining feature routes.

## Authorization

API Gateway validates Cognito JWTs for every route except `GET /health`. The
handler reads the verified `sub` claim from `event.requestContext.authorizer`
and enforces per-user ownership — there is no Postgres Row-Level Security on
this stack.

## Secrets

Database credentials and third-party API keys are read at runtime from AWS
Secrets Manager (ARNs passed as Lambda environment variables). No keys are
committed or shipped in the iOS binary.
