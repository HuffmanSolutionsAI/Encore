# Cognito user pool — Sign in with Apple is the primary method (build spec F1),
# with the native email/password fallback. The Apple identity provider is only
# created once the apple_signin credentials are supplied.

resource "aws_cognito_user_pool" "main" {
  name = "${local.name}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${local.name}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_identity_provider" "apple" {
  count = var.apple_signin.client_id == "" ? 0 : 1

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    client_id        = var.apple_signin.client_id
    team_id          = var.apple_signin.team_id
    key_id           = var.apple_signin.key_id
    private_key      = var.apple_signin.private_key
    authorize_scopes = "email name"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_user_pool_client" "ios" {
  # Name kept for backward-compatibility with existing terraform state; this
  # client now serves both the parked iOS app and the live web app.
  name         = "${local.name}-app"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  supported_identity_providers = concat(
    ["COGNITO"],
    var.apple_signin.client_id == "" ? [] : ["SignInWithApple"],
  )

  callback_urls = concat(
    ["encore://auth-callback"],
    [for url in var.web_base_urls : "${url}/auth/callback"],
  )
  logout_urls = concat(
    ["encore://auth-callback"],
    [for url in var.web_base_urls : "${url}/auth/signed-out"],
  )

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  depends_on = [aws_cognito_identity_provider.apple]
}
