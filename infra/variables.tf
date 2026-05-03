variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "production"
}

variable "program_id" {
  description = "Deployed Solana program ID"
}

variable "helius_rpc_url_secret_arn" {
  description = "ARN of Secrets Manager secret containing HELIUS_RPC_URL"
}

variable "irys_private_key_secret_arn" {
  description = "ARN of Secrets Manager secret containing IRYS_PRIVATE_KEY"
}

variable "backend_private_key_secret_arn" {
  description = "ARN of Secrets Manager secret containing BACKEND_PRIVATE_KEY"
}

variable "database_url_secret_arn" {
  description = "ARN of Secrets Manager secret containing DATABASE_URL (Neon PostgreSQL)"
}

variable "listener_image" {
  description = "ECR image URI for listener (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/code-eternal-listener:latest)"
}

variable "site_gen_image" {
  description = "ECR image URI for site-gen"
}

variable "vpc_id" {
  description = "VPC ID to deploy ECS tasks into"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for ECS tasks (private subnets recommended)"
}
