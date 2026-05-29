#!/bin/bash
set -e
echo "==> Removing old frontend image..."
docker-compose rm -f frontend
docker images | grep -i "talentos.*frontend\|frontend.*talentos" | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

echo "==> Rebuilding with --no-cache..."
docker-compose build --no-cache frontend

echo "==> Restarting..."
docker-compose up -d frontend

echo "==> Verifying NEXT_PUBLIC_API_URL is empty in new bundle..."
sleep 5
docker-compose exec frontend grep -r "localhost:8000" /app/.next/static/chunks/ 2>/dev/null && echo "WARNING: localhost still in bundle!" || echo "OK: localhost:8000 not found in bundle"
