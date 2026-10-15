#!/bin/bash
set -euo pipefail

image="${1:?image tag}"

cleanup() {
  docker rm -f gym-easy-boot >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm --entrypoint node "${image}" --input-type=module -e "
import { existsSync } from 'node:fs';
import { hash, verify } from '@node-rs/argon2';
for (const name of ['@node-rs/argon2-linux-x64-gnu', '@node-rs/argon2-linux-arm64-gnu']) {
  if (!existsSync('/app/node_modules/' + name)) {
    console.error('missing ' + name);
    process.exit(1);
  }
}
const hashed = await hash('gym-easy-argon2-smoke');
if (!(await verify(hashed, 'gym-easy-argon2-smoke'))) process.exit(2);
console.log('argon2: ok');
"

docker rm -f gym-easy-boot >/dev/null 2>&1 || true
docker run -d --name gym-easy-boot --network host \
  -e NODE_ENV=production \
  -e CI=true \
  -e EMAIL_TRANSPORT=resend \
  -e RESEND_API_KEY=ci-resend-key-not-secret \
  -e EMAIL_FROM='Gym Easy <noreply@gaffer.pt>' \
  -e APP_URL=http://127.0.0.1:3000 \
  -e DATABASE_URL=postgresql://gym_easy_app:app@127.0.0.1:5432/gym_easy \
  -e DATABASE_URL_MIGRATOR=postgresql://gym_easy_migrator:migrator@127.0.0.1:5432/gym_easy \
  -e DB_TLS_MODE=insecure \
  -e CONFIRM_EMAIL_SECRET=confirm-email-secret-for-e2e-only-00 \
  -e CONSENT_PSEUDONYM_KEY=ci-consent-pseudonym-key-not-secret \
  -e CRON_SECRET=ci-cron-secret-value-32-characters-ok \
  -e RUN_MIGRATIONS=true \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  "${image}"

status=starting
deadline=$(($(date +%s) + 180))
while [ "$(date +%s)" -lt "${deadline}" ]; do
  if ! docker inspect --format '{{.State.Running}}' gym-easy-boot | grep -q true; then
    echo "container exited before it was healthy" >&2
    docker logs gym-easy-boot >&2 || true
    exit 1
  fi
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' gym-easy-boot)"
  echo "health=${status}"
  if [ "${status}" = "healthy" ]; then
    break
  fi
  sleep 2
done

if [ "${status}" != "healthy" ]; then
  echo "HEALTHCHECK did not reach healthy (status=${status})" >&2
  docker inspect --format '{{json .State.Health}}' gym-easy-boot >&2 || true
  docker logs gym-easy-boot >&2 || true
  exit 1
fi

docker logs gym-easy-boot >/tmp/gym-easy-boot.log 2>&1
grep -q 'migrate-on-deploy: applied' /tmp/gym-easy-boot.log
docker exec gym-easy-boot node /app/scripts/purge-consent.mjs
docker exec gym-easy-boot node /app/scripts/purge-coach-messages.mjs
