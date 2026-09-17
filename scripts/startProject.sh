#!/bin/bash
set -e

bash scripts/createCertSSL.sh

echo "Starting project..."
if [ -f cloudflared/config.yml ]; then
    echo "cloudflared/config.yml found — starting the tunnel too."
    COMPOSE_PROFILES=tunnel docker compose up
else
    docker compose up
fi
