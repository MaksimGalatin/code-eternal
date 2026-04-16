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
