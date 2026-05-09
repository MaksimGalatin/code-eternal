#!/bin/bash
set -e

# Run on a fresh Ubuntu 24.04 Hetzner VM as root

# Docker
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Certbot
apt-get install -y certbot

echo "Done. Next steps:"
echo "1. Copy .env to /opt/code-eternal/.env"
echo "2. Copy docker/docker-compose.yml and docker/nginx.conf to /opt/code-eternal/docker/"
echo "3. Run: certbot certonly --standalone -d app.codeofdigitaleternity.com -d listener.codeofdigitaleternity.com"
echo "4. Run: cd /opt/code-eternal && docker login && docker compose -f docker/docker-compose.yml up -d"
