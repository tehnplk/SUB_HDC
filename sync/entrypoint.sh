#!/bin/sh
set -eu

: "${SYNC_JOBS_FILE:=/sync/sync-jobs.json}"
: "${SYNC_CRONTAB_FILE:=/etc/crontabs/root}"

echo "sync target: $(node -e "process.stdout.write(require('/sync/post/resolve_target_url').resolveTargetUrl())")"
echo "sync jobs file: ${SYNC_JOBS_FILE}"

node /sync/setup_cron.js

exec crond -f -l 8
