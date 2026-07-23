#!/bin/sh
set -e

echo "Running database migrations..."
pnpm db:migrate

echo "Seeding database..."
NODE_ENV=production pnpm seed:prod

echo "Starting server..."
exec node dist/main
