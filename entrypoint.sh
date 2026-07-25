#!/bin/sh
set -e

echo "Running database migrations..."
node_modules/.bin/drizzle-kit migrate

echo "Seeding database..."
NODE_ENV=production node dist/db/seeds/medical-conditions.seed.js

echo "Starting server..."
exec node dist/main
