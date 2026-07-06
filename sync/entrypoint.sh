#!/bin/sh
set -eu

: "${SYNC_TARGET_URL:=https://subhdc.plkhealth.go.th/api/data-sync-in}"
: "${SYNC_JOBS_FILE:=/sync/sync-jobs.json}"
: "${SYNC_CRONTAB_FILE:=/etc/crontabs/root}"

echo "sync target: ${SYNC_TARGET_URL}"
echo "sync jobs file: ${SYNC_JOBS_FILE}"

node /sync/setup_cron.js

exec crond -f -l 8
