variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name, used as a resource name prefix."
  type        = string
  default     = "encore"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "encore"
}

variable "db_username" {
  description = "Master username for the RDS instance."
  type        = string
  default     = "encore_admin"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Run RDS across two availability zones. Recommended true for production."
  type        = bool
  default     = false
}

variable "web_base_urls" {
  description = "Hostnames where the web app runs. Used to register OAuth callback + logout URLs with Cognito. Include both the deployed Amplify host and any local dev origins."
  type        = list(string)
  default = [
    "http://localhost:3000",
  ]
}

variable "apple_signin" {
  description = "Sign in with Apple credentials for the Cognito identity provider. Leave blank to skip wiring the provider."
  type = object({
    client_id   = string # Apple Services ID
    team_id     = string
    key_id      = string
    private_key = string
  })
  sensitive = true
  default = {
    client_id   = ""
    team_id     = ""
    key_id      = ""
    private_key = ""
  }
}
