#!/bin/bash
set -e

OUT="${1:-$HOME/Desktop/ft_transcendance_secrets.zip}"

FILES=()
[ -f .env ] && FILES+=(".env")
[ -d cloudflared ] && FILES+=("cloudflared")

if [ ${#FILES[@]} -eq 0 ]; then
    echo "Nothing to pack — no .env or cloudflared/ found in the project root."
    exit 1
fi

echo "Packing: ${FILES[*]}"
echo "You'll be asked to set a password for the zip — share it with your"
echo "teammate through a DIFFERENT channel than the zip itself (e.g. zip via"
echo "chat, password read out loud or sent another way)."
echo ""
rm -f "$OUT"
zip -er "$OUT" "${FILES[@]}"
echo ""
echo "Done: $OUT"
