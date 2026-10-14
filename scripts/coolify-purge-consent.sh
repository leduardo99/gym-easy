#!/bin/sh
# Coolify scheduled task: daily at 03:15 UTC.
# Requires CRON_SECRET (at least 32 characters) and APP_URL.
# Does not print the secret.
set -eu

: "${CRON_SECRET:?CRON_SECRET is required}"
: "${APP_URL:?APP_URL is required}"

curl --fail --silent --show-error --proto '=https' --max-time 30 \
  --request POST \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  --output /dev/null \
  "${APP_URL%/}/api/cron/purge-consent-proofs"
