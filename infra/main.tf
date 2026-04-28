terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── ECR Repositories ─────────────────────────────────────────────

resource "aws_ecr_repository" "listener" {
  name                 = "code-eternal-listener"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "site_gen" {
  name                 = "code-eternal-site-gen"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ─── SQS FIFO Queue ───────────────────────────────────────────────

resource "aws_sqs_queue" "jobs_dlq" {
  name                        = "code-eternal-jobs-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600 # 14 days
}

resource "aws_sqs_queue" "jobs" {
  name                        = "code-eternal-jobs.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 120
  message_retention_seconds   = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.jobs_dlq.arn
    maxReceiveCount     = 3
  })
}

# ─── Helius Webhook Secret ─────────────────────────────────────────
# Auto-generated once; stored in Secrets Manager; injected into listener

resource "random_password" "webhook_secret" {
  length  = 40
  special = false
}

resource "aws_secretsmanager_secret" "helius_webhook_secret" {
  name                    = "code-eternal/helius-webhook-secret"
  recovery_window_in_days = 0 # allow immediate deletion on terraform destroy
}

resource "aws_secretsmanager_secret_version" "helius_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.helius_webhook_secret.id
  secret_string = random_password.webhook_secret.result
}

# ─── IAM Role for ECS Tasks ───────────────────────────────────────

resource "aws_iam_role" "ecs_task_execution" {
  name = "code-eternal-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "code-eternal-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "code-eternal-task-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.jobs.arn,
          aws_sqs_queue.jobs_dlq.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.helius_rpc_url_secret_arn,
          var.irys_private_key_secret_arn,
          var.backend_private_key_secret_arn,
          var.database_url_secret_arn,
          aws_secretsmanager_secret.helius_webhook_secret.arn,
        ]
      }
    ]
  })
}

# ─── CloudWatch Log Groups ────────────────────────────────────────

resource "aws_cloudwatch_log_group" "listener" {
  name              = "/ecs/code-eternal-listener"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "site_gen" {
  name              = "/ecs/code-eternal-site-gen"
  retention_in_days = 14
}

# ─── ECS Cluster ─────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "code-eternal"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ─── Security Groups ──────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name   = "code-eternal-alb"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name   = "code-eternal-ecs-tasks"
  vpc_id = var.vpc_id

  # Allow inbound from ALB only
  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # site-gen has no inbound — it only polls SQS
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ─── ALB for listener ─────────────────────────────────────────────

resource "aws_lb" "listener" {
  name               = "code-eternal-listener"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids
}

resource "aws_lb_target_group" "listener" {
  name        = "code-eternal-listener"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip" # required for Fargate awsvpc networking

  health_check {
    path                = "/health"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "listener_http" {
  load_balancer_arn = aws_lb.listener.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.listener.arn
  }
}

# ─── ECS Task Definition: listener ────────────────────────────────

resource "aws_ecs_task_definition" "listener" {
  family                   = "code-eternal-listener"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "listener"
    image     = var.listener_image
    essential = true

    portMappings = [{ containerPort = 3001, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV",      value = "production" },
      { name = "AWS_REGION",    value = var.aws_region },
      { name = "PROGRAM_ID",    value = var.program_id },
      { name = "SQS_QUEUE_URL", value = aws_sqs_queue.jobs.url }
    ]

    secrets = [
      { name = "HELIUS_RPC_URL",        valueFrom = var.helius_rpc_url_secret_arn },
      { name = "HELIUS_WEBHOOK_SECRET", valueFrom = aws_secretsmanager_secret.helius_webhook_secret.arn },
      { name = "DATABASE_URL",          valueFrom = var.database_url_secret_arn }
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:3001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.listener.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition: site-gen ────────────────────────────────

resource "aws_ecs_task_definition" "site_gen" {
  family                   = "code-eternal-site-gen"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "site-gen"
    image     = var.site_gen_image
    essential = true

    portMappings = [{ containerPort = 3002, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV",      value = "production" },
      { name = "AWS_REGION",    value = var.aws_region },
      { name = "PROGRAM_ID",    value = var.program_id },
      { name = "SQS_QUEUE_URL", value = aws_sqs_queue.jobs.url }
    ]

    secrets = [
      { name = "HELIUS_RPC_URL",      valueFrom = var.helius_rpc_url_secret_arn },
      { name = "IRYS_PRIVATE_KEY",    valueFrom = var.irys_private_key_secret_arn },
      { name = "BACKEND_PRIVATE_KEY", valueFrom = var.backend_private_key_secret_arn },
      { name = "DATABASE_URL",        valueFrom = var.database_url_secret_arn }
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:3002/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.site_gen.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Services ─────────────────────────────────────────────────

resource "aws_ecs_service" "listener" {
  name            = "code-eternal-listener"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.listener.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.listener.arn
    container_name   = "listener"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.listener_http]

  lifecycle {
    ignore_changes = [task_definition]
  }
}

resource "aws_ecs_service" "site_gen" {
  name            = "code-eternal-site-gen"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.site_gen.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }
}

# ─── Helius Webhook Registration ──────────────────────────────────
# Registers the webhook via Helius REST API after the ALB is ready.
# Runs again if the listener URL or program ID changes.

resource "null_resource" "helius_webhook" {
  triggers = {
    webhook_url = "http://${aws_lb.listener.dns_name}/webhook/helius"
    program_id  = var.program_id
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -sf -X POST \
        "https://api.helius.xyz/v0/webhooks?api-key=${var.helius_api_key}" \
        -H "Content-Type: application/json" \
        -d "{\"webhookURL\":\"http://${aws_lb.listener.dns_name}/webhook/helius\",\"transactionTypes\":[\"Any\"],\"accountAddresses\":[\"${var.program_id}\"],\"webhookType\":\"enhanced\",\"authHeader\":\"${random_password.webhook_secret.result}\"}"
    EOT
  }

  depends_on = [
    aws_lb_listener.listener_http,
    aws_secretsmanager_secret_version.helius_webhook_secret,
  ]
}
