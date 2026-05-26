# AWS Amplify Hosting — serves the Next.js 15 web app from infra/../web.
#
# Two-apply pattern (chicken-and-egg with the OAuth redirect URI):
#   1. First `terraform apply` creates the Amplify app and branch. The
#      default branch URL is then `https://${branch}.${app_id}.amplifyapp.com`.
#      The output `amplify_branch_url` shows it.
#   2. Set the same value in `terraform.tfvars` as `amplify_branch_url`
#      (and append it to `web_base_urls`) and run `terraform apply` again.
#      This pass writes the public-redirect-URI env var that the web app
#      ships with, AND registers the URL as a Cognito callback.
#
# Set `amplify_github_token = ""` to skip the entire Amplify stack
# (useful during local-only dev or when you haven't set up the GitHub PAT yet).

resource "aws_iam_role" "amplify" {
  count = var.amplify_github_token == "" ? 0 : 1
  name  = "${local.name}-amplify"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "amplify.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# AWS-managed policy that covers the things Amplify Hosting needs at runtime:
# pushing build + access logs to CloudWatch, fetching artifacts from S3, and
# provisioning the Lambda compute that runs Next.js SSR.
resource "aws_iam_role_policy_attachment" "amplify" {
  count      = var.amplify_github_token == "" ? 0 : 1
  role       = aws_iam_role.amplify[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AdministratorAccess-Amplify"
}

resource "aws_amplify_app" "web" {
  count = var.amplify_github_token == "" ? 0 : 1

  name         = "${local.name}-web"
  description  = "Encore web app (Next.js 15, App Router, SSR)"
  repository   = var.amplify_github_repo
  access_token = var.amplify_github_token

  # WEB_COMPUTE is Amplify's Next.js SSR platform — `/album/[id]` is a
  # dynamic route, so a static-only deploy wouldn't work.
  platform = "WEB_COMPUTE"

  iam_service_role_arn = aws_iam_role.amplify[0].arn

  # Build spec lives in amplify.yml at the repo root (not here) so build
  # commands evolve with the code, not with infra.
  enable_branch_auto_build = true

  # Public web config — safe to ship to a browser. `NEXT_PUBLIC_*` is the
  # Next.js convention that exposes a value to client bundles.
  environment_variables = {
    NEXT_PUBLIC_API_BASE_URL      = aws_apigatewayv2_stage.default.invoke_url
    NEXT_PUBLIC_COGNITO_DOMAIN    = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
    NEXT_PUBLIC_COGNITO_CLIENT_ID = aws_cognito_user_pool_client.ios.id
    # Filled on the second `terraform apply` once the Amplify URL is known —
    # see the two-apply note at the top of this file.
    NEXT_PUBLIC_COGNITO_REDIRECT_URI = var.amplify_branch_url == "" ? "" : "${var.amplify_branch_url}/auth/callback"
  }

  # The default Next.js behaviour fits Amplify Hosting's SSR runtime; no
  # custom rewrite rules needed.
}

resource "aws_amplify_branch" "main" {
  count = var.amplify_github_token == "" ? 0 : 1

  app_id      = aws_amplify_app.web[0].id
  branch_name = var.amplify_branch
  framework   = "Next.js - SSR"
  stage       = "PRODUCTION"

  enable_auto_build = true
}

# Webhook so pushes to the tracked branch trigger a build. Amplify also
# wires GitHub-side webhooks automatically when you supply an access token,
# but explicit declaration keeps the trigger visible in Terraform.
resource "aws_amplify_webhook" "main" {
  count       = var.amplify_github_token == "" ? 0 : 1
  app_id      = aws_amplify_app.web[0].id
  branch_name = aws_amplify_branch.main[0].branch_name
  description = "Push trigger for ${var.amplify_branch}"
}
