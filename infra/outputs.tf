output "api_base_url" {
  description = "Base URL of the HTTP API."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  description = "Cognito user pool id."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito app client id used by both the web app and the parked iOS app."
  value       = aws_cognito_user_pool_client.ios.id
}

output "cognito_domain" {
  description = "Cognito hosted-UI domain."
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "db_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.main.address
}

output "db_secret_arn" {
  description = "Secrets Manager ARN holding the database connection details."
  value       = aws_secretsmanager_secret.db.arn
}
