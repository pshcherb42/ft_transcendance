#!/bin/bash
set -e

CLOUDFLARED="./cloudflared"

if [ -f "$CLOUDFLARED" ]; then
    echo "cloudflared already present."
    exit 0
fi

if [ "$(uname -s)" = "Darwin" ]; then
    echo "On macOS, install with: brew install cloudflared"
    exit 0
fi

echo "Downloading cloudflared (linux-amd64)..."
curl -L -o "$CLOUDFLARED" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x "$CLOUDFLARED"
