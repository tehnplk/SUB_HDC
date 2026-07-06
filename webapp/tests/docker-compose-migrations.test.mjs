import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const composePath = path.resolve(process.cwd(), "..", "docker-compose.yml");

test("docker compose starts webapp through database migrations", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.match(compose, /command:\s*sh -c "node lib\/run_migrations\.js && npm run start"/);
  assert.match(compose, /- \.\/table_update:\/app\/table_update:ro/);
});

test("docker compose includes hourly sync service mounted at /sync", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.match(compose, /\n  sync:/);
  assert.match(compose, /container_name:\s*sub_hdc_sync/);
  assert.match(compose, /env_file:\s*\n\s+- \.\/webapp\/\.env/);
  assert.match(compose, /SYNC_JOBS_FILE:\s*"\/sync\/sync-jobs\.json"/);
  assert.match(compose, /SYNC_RUN_ON_START:\s*"true"/);
  assert.match(compose, /SYNC_TARGET_URL:\s*"https:\/\/subhdc\.plkhealth\.go\.th\/api\/data-sync-in"/);
  assert.match(compose, /UPDATE_LOG_FILE:\s*"\/sync\/update_log\.json"/);
  assert.doesNotMatch(compose, /SYNC_SCRIPT/);
  assert.doesNotMatch(compose, /SYNC_PAYLOAD_FILE/);
  assert.match(compose, /command:\s*sh \/sync\/entrypoint\.sh/);
  assert.match(compose, /- \.\/sync:\/sync/);
  assert.match(compose, /- \.\/webapp\/update_log\.json:\/sync\/update_log\.json:ro/);
});

test("sync jobs schedule check every 30 minutes and service count every hour", async () => {
  const jobsPath = path.resolve(process.cwd(), "..", "sync", "sync-jobs.json");
  const jobs = JSON.parse(await readFile(jobsPath, "utf8"));

  assert.deepEqual(
    jobs.map(({ name, script, cron, enabled }) => ({ name, script, cron, enabled })),
    [
      {
        name: "check",
        script: "post/post_check_sub_center.js",
        cron: "*/30 * * * *",
        enabled: true,
      },
      {
        name: "service_count",
        script: "post/post_count_file_service.js",
        cron: "0 * * * *",
        enabled: true,
      },
    ]
  );
});
