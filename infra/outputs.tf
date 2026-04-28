output "listener_ecr_url" {
  value = aws_ecr_repository.listener.repository_url
}

output "site_gen_ecr_url" {
  value = aws_ecr_repository.site_gen.repository_url
}

output "sqs_queue_url" {
  value = aws_sqs_queue.jobs.url
}

output "sqs_dlq_url" {
  value = aws_sqs_queue.jobs_dlq.url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "listener_url" {
  description = "Public URL of the listener service"
  value       = "http://${aws_lb.listener.dns_name}"
}

output "helius_webhook_url" {
  description = "Full URL registered with Helius"
  value       = "http://${aws_lb.listener.dns_name}/webhook/helius"
}

output "helius_webhook_secret_arn" {
  description = "ARN of the Secrets Manager secret holding HELIUS_WEBHOOK_SECRET"
  value       = aws_secretsmanager_secret.helius_webhook_secret.arn
}
