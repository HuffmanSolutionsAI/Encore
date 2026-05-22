# Third-party API keys (Last.fm, MusicBrainz User-Agent). Created empty —
# real values are set out-of-band so they never enter version control or
# Terraform state diffs:
#   aws_secretsmanager_secret_version is created once, then ignored.

resource "aws_secretsmanager_secret" "thirdparty" {
  name        = "${local.name}/thirdparty"
  description = "Encore third-party API credentials"
}

resource "aws_secretsmanager_secret_version" "thirdparty" {
  secret_id = aws_secretsmanager_secret.thirdparty.id
  secret_string = jsonencode({
    LASTFM_API_KEY         = ""
    LASTFM_SHARED_SECRET   = ""
    MUSICBRAINZ_USER_AGENT = "Encore/1.0 ( contact@example.com )"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
