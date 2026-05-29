#!/bin/bash
set -e

echo "==> Force-removing ALL talentos containers via docker directly..."
# Stop and remove by name pattern (handles both talentos_xxx and hash_talentos_xxx)
docker ps -a | grep "talentos" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null && echo "Removed talentos containers" || echo "No containers to remove"

echo "==> Removing old images..."
docker images | grep "talentos_" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo "==> Building..."
docker-compose build --no-cache

echo "==> Starting..."
docker-compose up -d

echo "==> Done!"
docker-compose ps
