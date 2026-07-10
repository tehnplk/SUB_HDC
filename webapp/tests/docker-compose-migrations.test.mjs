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
  assert.match(compose, /UPDATE_LOG_FILE:\s*"\/webapp-version\/update_log\.json"/);
  assert.doesNotMatch(compose, /SYNC_SCRIPT/);
  assert.doesNotMatch(compose, /SYNC_PAYLOAD_FILE/);
  assert.match(
    compose,
    /command:\s*\["sh", "-c", "node \/sync\/setup_cron\.js && exec crond -f -l 8"\]/
  );
  assert.match(compose, /- \.\/sync:\/sync/);
  // mount โฟลเดอร์ webapp/version (read-only) แทน single-file bind mount เพื่อให้
  // cron อ่าน update_log.json ล่าสุดได้เสมอโดยไม่ต้อง recreate หลัง bump version
  // (ใช้โฟลเดอร์ย่อยเฉพาะ version/ ไม่ expose source/.env ของ webapp)
  assert.match(compose, /- \.\/webapp\/version:\/webapp-version:ro/);
  assert.doesNotMatch(compose, /update_log\.json:\/sync\/update_log\.json/);
});

test("sync jobs include a 15-minute sync SQL refresh", async () => {
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
      {
        name: "sync_kpi",
        script: "post/post_sync_kpi.js",
        cron: "* * * * *",
        enabled: true,
      },
      {
        name: "refresh_sync_sql_data",
        script: "post/pull_sql_for_sync_data.js",
        cron: "*/15 * * * *",
        enabled: true,
      },
    ]
  );
});
