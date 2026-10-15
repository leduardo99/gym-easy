#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

docker run --rm --network host \
  -v "${root}/scripts/bootstrap-ci-roles.sql:/bootstrap.sql:ro" \
  postgres:16 \
  psql "postgresql://postgres:postgres@127.0.0.1:5432/postgres" \
  -v ON_ERROR_STOP=1 \
  -f /bootstrap.sql

docker run --rm --network host \
  -v "${root}/scripts/ci-assert-migrator.sql:/assert.sql:ro" \
  postgres:16 \
  psql "postgresql://postgres:postgres@127.0.0.1:5432/postgres" \
  -v ON_ERROR_STOP=1 \
  -f /assert.sql
