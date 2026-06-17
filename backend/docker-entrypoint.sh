#!/bin/sh
set -e

# Generate Prisma client
npx prisma generate

# Wait for DB and push schema
echo "Waiting for database and applying schema..."
until npx prisma db push
do
  echo "Database not ready yet. Sleeping 2s..."
  sleep 2
done

echo "Database schema applied. Starting app..."

exec npm run start:dev
