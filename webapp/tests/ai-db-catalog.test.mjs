import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatDbCatalog } from "../lib/ai-db-catalog.mjs";

test("formatDbCatalog groups summary, raw, and lookup tables compactly", () => {
  const text = formatDbCatalog(
    ["person", "service", "c_hospital", "c_person_sex", "s_visit", "t_person_dm_ht", "log_import_file", "hdc_api_report", "schema_migrations"],
    new Map([["s_visit", "hospcode,fiscal_year,month,visit_person,visit_count"]])
  );

  assert.match(text, /s_visit\(hospcode,fiscal_year,month,visit_person,visit_count\)/);
  assert.match(text, /t_person_dm_ht/);
  assert.match(text, /raw F43: person, service/);
  assert.match(text, /lookup\/master: c_hospital, c_person_sex/);
  // infra tables never reach the model catalog
  assert.doesNotMatch(text, /log_import_file|hdc_api_report|schema_migrations/);
});

test("chat route injects the cached db catalog as a system message", () => {
  const routeSource = readFileSync(new URL("../app/api/ai/chat/route.js", import.meta.url), "utf8");
  assert.match(routeSource, /getDbCatalog\(\)\.catch\(\(\) => ""\)/);
  assert.match(routeSource, /dbCatalog \? \[\{ role: "system", content: dbCatalog \}\] : \[\]/);
});
