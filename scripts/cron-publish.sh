#!/bin/bash
set -euo pipefail
exec 9>/tmp/ryval-forge-cron.lock
if ! flock -n 9; then
  echo "cron already running" >&2
  exit 0
fi
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET missing" >&2
  exit 1
fi
exec curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:${PORT:-3000}/api/cron/publish-due"
