# Deploying Encore

End-to-end, from zero to a working URL. Steps marked **YOU** are manual
clicks; everything else is `terraform apply` doing its thing.

```
                  ┌──────────────────┐
  Browser ─HTTPS─▶│ Amplify Hosting  │  Next.js SSR + static
                  │  (this guide)    │
                  └────────┬─────────┘
                           │ HTTPS, Bearer JWT
                           ▼
                  ┌──────────────────┐
                  │  API Gateway     │  Cognito JWT authorizer
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  API Lambda      │──▶  RDS Postgres
                  └──────────────────┘     Secrets Manager
                                           Last.fm · MusicBrainz
```

---

## 0. Prerequisites (one-time)

- **AWS account** with admin access locally (`aws sts get-caller-identity`
  should print your identity).
- **Terraform ≥ 1.6**.
- **Node 22 + npm 10** (matches what Amplify Hosting runs and what we build
  the Lambda bundle with).
- **A GitHub fine-grained PAT** — created below.

---

## 1. **YOU** — Create the GitHub access token

Amplify needs to clone the repo and manage its push-trigger webhook.

1. Open <https://github.com/settings/personal-access-tokens/new>.
2. **Token name:** `Encore Amplify Hosting`
3. **Resource owner:** `HuffmanSolutionsAI` (or your fork's owner).
4. **Repository access → Only select repositories →** pick **Encore**.
5. **Repository permissions:**
   - **Contents** → **Read-only**
   - **Metadata** → **Read-only** (auto-granted)
   - **Webhooks** → **Read and write**
6. Click **Generate token**, copy it (starts with `github_pat_…`),
   keep it somewhere safe — GitHub won't show it again.

> **GitHub App alternative:** if you'd rather not manage a PAT, set
> `amplify_github_token = ""` and connect the repo to Amplify through the
> AWS console once. Terraform will skip creating the Amplify resources;
> create the Amplify app manually in the console and point it at this repo,
> then come back and inline the env vars from step 3.

---

## 2. **YOU** — Push the working branch to GitHub

Amplify tracks a branch by name (default `main`). Either merge your work
to `main` first, or set `amplify_branch = "<your-branch>"` in
`terraform.tfvars`.

```sh
git push -u origin main          # or whichever branch you're shipping
```

---

## 3. **YOU** — Fill in `terraform.tfvars`

```sh
cd infra
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars
```

Required for the first apply:

```hcl
amplify_github_repo  = "https://github.com/HuffmanSolutionsAI/Encore"
amplify_github_token = "github_pat_..."   # from step 1
amplify_branch       = "main"             # branch from step 2
amplify_branch_url   = ""                 # leave blank — filled after step 5
```

Leave `apple_signin` blank if you don't have Apple Developer credentials
yet — the hosted UI will fall back to email/password.

---

## 4. Build the Lambda bundle, then **YOU** — `terraform apply` (first pass)

The Lambda Terraform resource expects `api/dist/handler.js` to exist.

```sh
cd ../api && npm install && npm run build
cd ../infra
terraform init
terraform apply
```

Takes ~8 minutes — most of it is the RDS instance.

When it finishes, note these outputs:

- `amplify_branch_url` — looks like `https://main.d1234567890.amplifyapp.com`
- `api_base_url`
- `cognito_domain`
- `cognito_client_id`

---

## 5. **YOU** — Seed third-party API keys

Last.fm + MusicBrainz keys live in Secrets Manager. Terraform created the
secret as an empty placeholder; populate it now:

```sh
aws secretsmanager put-secret-value \
  --secret-id encore-dev/thirdparty \
  --secret-string '{
    "LASTFM_API_KEY":"<your-key>",
    "LASTFM_SHARED_SECRET":"<your-secret>",
    "MUSICBRAINZ_USER_AGENT":"Encore/1.0 ( your@email )"
  }'
```

Get a Last.fm API key at <https://www.last.fm/api/account/create>.
MusicBrainz needs no key — just the descriptive User-Agent.

---

## 6. Apply the schema to RDS

The RDS instance lives in private subnets, so you can't run `psql` directly
from your laptop. The quickest path is via Session Manager + a bastion or
via the Lambda itself. For the first migration the simplest option is to
make the DB temporarily public (RDS console → modify → public → apply,
allow your IP on the SG) and run:

```sh
PGPASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id encore-dev/db --query SecretString --output text \
  | jq -r .password) \
psql -h $(terraform output -raw db_endpoint) \
  -U encore_admin -d encore \
  -f ../api/migrations/0001_initial_schema.sql
```

Then flip RDS back to private. (Replace this dance with a Bastion later.)

---

## 7. **YOU** — Second `terraform apply`

Paste the Amplify branch URL from step 4 into `terraform.tfvars`:

```hcl
amplify_branch_url = "https://main.d1234567890.amplifyapp.com"
```

```sh
terraform apply
```

This pass does two things:

- Adds the URL to Cognito's `callback_urls` and `logout_urls` lists.
- Sets `NEXT_PUBLIC_COGNITO_REDIRECT_URI` on the Amplify app so the next
  build ships with it.

---

## 8. **YOU** — Trigger the first Amplify build

Amplify watches the branch, but it doesn't auto-start a build the moment
the app is created. Easiest kick:

- Push any commit to the tracked branch, **or**
- AWS Console → **Amplify → encore-dev-web → main → Redeploy this version**.

Watch the build logs in the Amplify console. First build is ~3 minutes.
Once it goes green, visit `amplify_branch_url`.

> If the build fails on env-var-missing errors, you forgot step 7 — the
> redirect URI is required at build time.

---

## 9. Smoke test

Open the Amplify URL:

1. The home page lands on `/auth/signin` (you're signed out).
2. **Continue with Apple** kicks Cognito hosted UI. Without
   `apple_signin`, you'll see the Cognito sign-up form instead — create
   an account with your email.
3. After sign-in, Cognito redirects to `/auth/callback`, which exchanges
   the code and routes you into onboarding (handle → Last.fm → Spotify
   explainer).
4. End on the now-playing screen. Play something on Spotify and it
   should appear within ~30 seconds.

---

## Operations

### Tail Amplify build logs

```sh
aws amplify get-job \
  --app-id $(terraform output -raw amplify_app_id) \
  --branch-name main \
  --job-id <id-from-list-jobs>
```

### Manually re-deploy

```sh
aws amplify start-job \
  --app-id $(terraform output -raw amplify_app_id) \
  --branch-name main \
  --job-type RELEASE
```

### Roll an env var

Edit `infra/amplify.tf` → `environment_variables`, then `terraform apply`,
then re-deploy from the console.

### Custom domain (later)

The Amplify console handles ACM + Route 53 wiring. Once you own a domain:
**App settings → Domain management → Add domain**. Then add the new origin
to `web_base_urls` in `terraform.tfvars` and re-apply so Cognito accepts
it as a callback.

### What if I'm shipping without an Apple Developer account?

The web app still works:

- The **Continue with Apple** button passes
  `identity_provider=SignInWithApple` to Cognito. If Apple isn't
  configured, Cognito returns an error. Until you have Apple creds,
  visit the hosted UI directly with no provider hint
  (`https://<cognito-domain>/login?client_id=…&response_type=code&scope=email+openid+profile&redirect_uri=…`)
  to sign up with email.

A friendlier fix — adding an "or sign up with email" button alongside —
is on the M8 reliability pass.
