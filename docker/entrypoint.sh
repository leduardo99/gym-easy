#!/bin/sh
set -eu

# Bundled with esbuild in the image. Migrations live in /app/migrations.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  node /app/migrate-on-deploy.mjs
fi

exec node /app/server.js
