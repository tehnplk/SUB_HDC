import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const composePath = path.resolve(process.cwd(), "..", "docker-compose.yml");

test("docker compose runs database migrations in a one-shot migrate service", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.match(compose, /\n  migrate:/);
  assert.match(compose, /container_name:\s*sub_hdc_migrate/);
  // migrate เป็นบริการแยก build จากโฟลเดอร์ migrate/ ของตัวเอง
  assert.match(compose, /migrate:\s*\n\s+build:\s*\n\s+context: \.\/migrate/);
  assert.match(compose, /image:\s*sub-hdc-migrate/);
  // one-shot: ต้องไม่ restart ไม่งั้นวนรัน migration ซ้ำ
  assert.match(compose, /migrate:[\s\S]*?restart:\s*"no"/);
  assert.match(compose, /- \.\/migrate\/table_update:\/migrate\/table_update:ro/);
  assert.match(compose, /- \.\/migrate\/table:\/docker-entrypoint-initdb\.d:ro/);
  // webapp รอทั้ง MariaDB/PostGIS; importer/summarize/transform รอ MariaDB
  assert.equal(
    (compose.match(/condition:\s*service_completed_successfully/g) || []).length,
    5
  );
  // webapp ไม่รัน migration เองแล้ว — ใช้ CMD จาก Dockerfile ตรง ๆ
  assert.doesNotMatch(compose, /node lib\/run_migrations\.js && npm run start/);
});

test("docker compose includes a PostGIS service for the GIS module", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.match(compose, /\n  postgis:/);
  assert.match(compose, /container_name:\s*sub_hdc_postgis/);
  assert.match(compose, /image:\s*postgis\/postgis:17-3\.5/);
  assert.match(compose, /POSTGRES_DB:\s*sub_hdc_gis/);
  // 5432/5433 ถูกใช้โดย postgres ตัวอื่นบนเครื่อง dev
  assert.match(compose, /- "5434:5432"/);
  assert.match(compose, /- sub_hdc_postgis_data:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /pg_isready -U postgres -d sub_hdc_gis/);
  assert.match(compose, /volumes:[\s\S]*\n  sub_hdc_postgis_data:/);
  // image สร้าง extension postgis เองตอน init — mount ทับโฟลเดอร์ initdb จะบัง
  // script นั้น mount initdb จึงต้องมีที่เดียวคือของ mariadb
  assert.equal((compose.match(/docker-entrypoint-initdb\.d/g) || []).length, 1);
  assert.match(compose, /\n  postgis-migrate:/);
  assert.match(compose, /container_name:\s*sub_hdc_postgis_migrate/);
  assert.match(compose, /command:\s*\["node", "run_postgis_migrations\.js"\]/);
  assert.match(compose, /- \.\/migrate\/postgis:\/migrate\/postgis:ro/);
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
        script: "jobs/post_check_sub_center.js",
        cron: "*/30 * * * *",
        enabled: true,
      },
      {
        name: "sync_kpi",
        script: "jobs/post_sync_kpi.js",
        cron: "* * * * *",
        enabled: true,
      },
      {
        name: "refresh_sync_sql_data",
        script: "jobs/pull_sql_for_sync_data.js",
        cron: "*/15 * * * *",
        enabled: true,
      },
      {
        name: "hdc_api_s_persontype",
        script: "jobs/hdc/hdc_api_s_persontype.js",
        cron: "0 3 * * *",
        enabled: true,
      },
      {
        name: "hdc_api_report",
        script: "jobs/hdc/hdc_api_report.js",
        cron: "30 3 * * *",
        enabled: true,
      },
    ]
  );
});
