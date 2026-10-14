#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  node /app/migrate-on-deploy.mjs
fi

exec node /app/server.js
