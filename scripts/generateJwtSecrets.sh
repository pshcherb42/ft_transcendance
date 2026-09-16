#!/bin/bash
set -e

FORCE=false
if [ "$1" = "-f" ] || [ "$1" = "--force" ]; then
    FORCE=true
fi

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -f "$ENV_FILE" ]; then
    if [ ! -f "$ENV_EXAMPLE" ]; then
        echo "No .env or .env.example found — run this from the project root."
        exit 1
    fi
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "Created $ENV_FILE from $ENV_EXAMPLE"
fi

# Fills in a real random value for $1 only if it's missing or still a
# <placeholder> from .env.example — never overwrites a secret that's
# already in use (that would invalidate every issued token/reset link),
# unless -f/--force is passed.
generate_secret() {
    local key="$1"
    local current
    current=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d '=' -f2-)

    if [ "$FORCE" != true ] && [ -n "$current" ] && [[ "$current" != \<*\> ]]; then
        echo "$key already set — skipping (use -f to force a new value)."
        return
    fi

    local value
    value=$(openssl rand -hex 32)

    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        rm -f "${ENV_FILE}.bak"
    else
        echo "${key}=${value}" >>"$ENV_FILE"
    fi
    echo "Generated $key"
}

generate_secret "JWT_SECRET"
generate_secret "JWT_REFRESH_SECRET"
generate_secret "JWT_RESET_SECRET"

echo "JWT secrets ready in $ENV_FILE"
