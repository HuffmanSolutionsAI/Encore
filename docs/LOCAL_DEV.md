# Running Encore locally

The whole stack on your laptop, no AWS account required.

```
       Browser
          │  http://localhost:3000
          ▼
   ┌──────────────┐
   │ Next.js (web)│  npm run dev (web/)
   └──────┬───────┘
          │  http://localhost:3001  +  x-dev-user-id header
          ▼
   ┌──────────────┐
   │ Local API    │  npm run dev (api/)
   └──────┬───────┘
          │  postgres://encore:encore@localhost:5432
          ▼
   ┌──────────────┐
   │ Postgres 16  │  docker compose up -d
   └──────────────┘
```

## Prerequisites

- **Docker Desktop** — for the Postgres container.
  <https://www.docker.com/products/docker-desktop>
- **Node 22** + npm 10 — `node --version` should print `v22.x`.
  If older, `brew install node@22`.

That's it. No AWS, no Terraform, no Cognito.

## First-time setup (~3 minutes)

```sh
# From the repo root:

# 1. Start Postgres.
docker compose up -d

# 2. Configure + start the API.
cd api
cp .env.example .env
npm install
npm run migrate      # applies api/migrations/*.sql
npm run dev          # listens on :3001

# 3. In a NEW terminal — configure + start the web app.
cd web
cp .env.local.example .env.local
npm install
npm run dev          # listens on :3000
```

Open <http://localhost:3000>. Click **Sign in as dev** → pick a handle →
skip Last.fm (or fill it in if you have a real account) → done.

## Daily loop

After first-time setup, just:

```sh
docker compose up -d        # if it's not already running
cd api && npm run dev       # terminal 1
cd web && npm run dev       # terminal 2
```

Both `dev` commands hot-reload on file changes.

## Optional: real Last.fm data

`/now-playing` calls Last.fm. Without an API key it returns a 503 and the
home screen shows "Last.fm isn't linked." Everything else works.

To wire it up:

1. Get a free API key at <https://www.last.fm/api/account/create>.
2. Edit `api/.env` and set `LASTFM_API_KEY=<your-key>`.
3. Restart `npm run dev` in api/.
4. In the web onboarding, enter your real Last.fm username when prompted.
5. Play something on Spotify (with the Last.fm scrobbling toggle on
   in your Spotify account settings) — it should appear within ~30s.

## Useful commands

```sh
# Reset Postgres entirely (drops all data).
docker compose down -v
docker compose up -d
cd api && npm run migrate

# Tail Postgres logs.
docker compose logs -f postgres

# Hit the API directly with a fake user id.
curl -H "x-dev-user-id: $(uuidgen)" http://localhost:3001/users/me

# Wipe your dev sign-in (browser).
# DevTools → Application → Local Storage → http://localhost:3000 → delete
# the `encore.dev.user_id` key, then refresh.
```

## How the dev shortcut works (and why it's safe)

- **API** — when `DEV_AUTH=1`, `requireAuth()` reads `x-dev-user-id`
  instead of validating a Cognito JWT. The Lambda *never* sets this
  env var; AWS API Gateway also strips arbitrary headers before
  invoking the function, so the same code is safe to deploy.
- **Web** — when `NEXT_PUBLIC_DEV_MODE=true`, the sign-in page shows
  "Sign in as dev" instead of "Continue with Apple". Each click mints
  a UUID stored in `localStorage` and the API client sends it as
  `x-dev-user-id`. With dev mode off, this code path is unreachable.

## When you're ready to deploy

See [`infra/DEPLOY.md`](../infra/DEPLOY.md) for the AWS Amplify Hosting
walkthrough.
