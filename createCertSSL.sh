#!/bin/bash
set -e

CERT_DIR="./nginx/certs"
ORGANIZATION="SOMECooLNAME"
mkdir -p "$CERT_DIR"

# If already generated, don't overwrite
if [ -f "$CERT_DIR/fullchain.crt" ] && [ -f "$CERT_DIR/privkey.key" ]; then
    echo "Certs already created in $CERT_DIR - skipping."
    exit 0
fi

OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
    LOCAL_IP=$(ipconfig getifaddr en0 || true)
elif [ "$OS" = "Linux" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}'  || true)
else
    LOCAL_IP="127.0.0.1"
fi

if [ -z "$LOCAL_IP" ]; then
    echo "⚠️ Cannot detect network IP, defaulting to 127.0.0.1"
    LOCAL_IP="127.0.0.1"
fi

echo "Generating autosigned certificate for: $LOCAL_IP..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.key" \
    -out "$CERT_DIR/fullchain.crt" \
    -subj "/C=ES/ST=Barcelona/L=Barcelona/O=$ORGANIZATION/CN=$LOCAL_IP" \
    -addext "subjectAltName=IP:$LOCAL_IP,IP:127.0.0.1,DNS:localhost"

echo "✅ DONE! Files successfully generated on $CERT_DIR"
echo "👉 Try the server on https://$LOCAL_IP"