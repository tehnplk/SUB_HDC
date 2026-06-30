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
