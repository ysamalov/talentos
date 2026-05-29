#!/bin/bash
set -e

echo "==> Stopping and removing ALL project containers (fixes ContainerConfig error)..."
docker-compose down --remove-orphans

echo "==> Removing old images to force rebuild..."
docker images | grep "talentos_" | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

echo "==> Rebuilding all images from scratch..."
docker-compose build --no-cache

echo "==> Starting all services..."
docker-compose up -d

echo "==> Done!"
