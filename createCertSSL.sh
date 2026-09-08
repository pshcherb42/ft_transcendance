#!/bin/bash
CERT_DIR="./nginx/certs"
ORGANIZATION="SOMECooLNAME"
mkdir -p "$CERT_DIR"

OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
    LOCAL_IP=$(ipconfig getifaddr en0)
elif ["$OS" = "Linux" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
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
    -addext "subjectAltName=IP:$LOCAL_IP,DNS:localhost" 2>/dev/null

echo "✅ DONE! Files successfully generated on $CERT_DIR"
echo "👉 Try the server on https://$LOCAL_IP"