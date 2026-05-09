#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [listener|site-gen|all]
# Requires: aws cli, docker, terraform already initialized in infra/

SERVICE=${1:-all}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

build_and_push() {
  local name=$1
  local context=$2
  local image="${ECR_BASE}/code-eternal-${name}:latest"

  echo "==> Building $name..."
  docker build --target production -t "$image" "$context"

  echo "==> Pushing $name..."
  docker push "$image"

  echo "==> Deploying $name to ECS..."
  aws ecs update-service \
    --cluster code-eternal \
    --service "code-eternal-${name}" \
    --force-new-deployment \
    --region "$AWS_REGION" \
    --output table
}

if [[ "$SERVICE" == "listener" || "$SERVICE" == "all" ]]; then
  build_and_push "listener" "./listener"
fi

if [[ "$SERVICE" == "site-gen" || "$SERVICE" == "all" ]]; then
  build_and_push "site-gen" "./site-gen"
fi

echo "Done. Watch rollout:"
echo "  aws ecs describe-services --cluster code-eternal --services code-eternal-listener code-eternal-site-gen --region $AWS_REGION"
