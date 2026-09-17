#!/bin/bash
set -e

ZIP="${1:?Usage: scripts/unpackSecrets.sh path/to/secrets.zip}"

if [ ! -f "$ZIP" ]; then
    echo "No such file: $ZIP"
    exit 1
fi

unzip "$ZIP" -d .
echo ""
echo "Extracted into the project root — check .env and cloudflared/ landed there."
