import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(process.cwd(), "..");

test("webapp reads and displays the correctly named transform data dictionary", async () => {
  const route = await readFile(
    path.join(repoRoot, "webapp", "app", "api", "dev", "transform-data-dict", "route.js"),
    "utf8"
  );
  const page = await readFile(
    path.join(repoRoot, "webapp", "app", "dev", "tranforms-data-dict", "page.js"),
    "utf8"
  );
  const compose = await readFile(path.join(repoRoot, "docker-compose.yml"), "utf8");

  assert.match(route, /transform_data_dict\.json/);
  assert.doesNotMatch(route, /transform_data_dic\.json/);
  assert.match(page, /transform\/transform_data_dict\.json/);
  assert.match(
    compose,
    /\.\/transform\/transform_data_dict\.json:\/app\/transform_data_dict\.json:ro/
  );
});
