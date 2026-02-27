#!/bin/bash
set -e

echo "=== Deploying Songbook ==="

if [ ! -f ".env" ]; then
    echo "ERROR: .env not found! Copy from .env.example and fill in secrets."
    exit 1
fi

echo "1. Pulling latest code..."
git pull origin main

echo "2. Building and starting containers..."
docker compose up -d --build

echo "3. Waiting for services..."
sleep 5

echo "4. Status:"
docker compose ps

echo ""
echo "=== Deployment complete ==="
echo "  App: https://${DOMAIN:-localhost}"
echo "  API: https://${DOMAIN:-localhost}/api/health"
