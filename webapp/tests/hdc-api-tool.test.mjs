import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HDC_API_TOOL,
  HDC_API_TOOL_NAME,
  MAX_HDC_API_ROWS,
  runHdcApiTool,
  userMentionedHdc,
} from "../lib/hdc-api-tool.mjs";

function mockConnection(rows) {
  return async () => ({
    query: async () => [rows],
    end: async () => {},
  });
}

test("hdc-api-tool is exposed with search/source_table/year parameters", () => {
  assert.equal(HDC_API_TOOL.function.name, "hdc-api-tool");
  const properties = HDC_API_TOOL.function.parameters.properties;
  assert.ok(properties.search);
  assert.ok(properties.source_table);
  assert.ok(properties.year);
});

test("search mode resolves reports from the local hdc_api_report catalog", async () => {
  const matches = [
    { report_name: "พัฒนาการเด็ก", source_table: "s_childdev_specialpp", category_name: "แม่และเด็ก" },
  ];
  const result = await runHdcApiTool({ search: "พัฒนาการ" }, { connectionFactory: mockConnection(matches) });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "search");
  assert.deepEqual(result.matches, matches);
  assert.match(result.note, /source_table/);
});

test("data mode posts to the HDC API and limits returned rows", async () => {
  const apiRows = Array.from({ length: MAX_HDC_API_ROWS + 20 }, (_, index) => ({
    hospcode: String(10000 + index),
    target: index,
  }));
  let requested;
  const result = await runHdcApiTool(
    { source_table: "s_childdev_specialpp", year: "2569" },
    {
      fetchData: async (table, year, province) => {
        requested = { table, year, province };
        return apiRows;
      },
      fetchSchema: async () => [
        { COLUMN_NAME: "hospcode", COLUMN_TYPE: "varchar(5)", COLUMN_COMMENT: "รหัสหน่วยบริการ" },
        { COLUMN_NAME: "target", COLUMN_TYPE: "int(11)", COLUMN_COMMENT: "เป้าหมาย" },
      ],
    }
  );

  assert.deepEqual(requested, { table: "s_childdev_specialpp", year: "2569", province: "65" });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "data");
  assert.equal(result.rowCount, MAX_HDC_API_ROWS);
  assert.equal(result.limited, true);
  assert.deepEqual(result.columns, ["hospcode", "target"]);
  // schema is attached so the model understands columns before answering
  assert.deepEqual(result.column_definitions, [
    { name: "hospcode", type: "varchar(5)", comment: "รหัสหน่วยบริการ" },
    { name: "target", type: "int(11)", comment: "เป้าหมาย" },
  ]);
  assert.match(result.note, /column_definitions first/);
});

test("data mode still works when the schema fetch fails", async () => {
  const result = await runHdcApiTool(
    { source_table: "s_x", year: "2569" },
    {
      fetchData: async () => [{ hospcode: "10001", target: 1 }, { hospcode: "10002", target: 2 }],
      fetchSchema: async () => {
        throw new Error("schema endpoint down");
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.rowCount, 2);
  assert.equal(result.column_definitions, null);
});

test("schema mode fetches column definitions without needing a year", async () => {
  const schemaRows = [
    { column: "hospcode", type: "varchar" },
    { column: "target", type: "int" },
  ];
  let requestedTable;
  const result = await runHdcApiTool(
    { source_table: "s_dm_control", action: "schema" },
    {
      fetchSchema: async (table) => {
        requestedTable = table;
        return schemaRows;
      },
    }
  );

  assert.equal(requestedTable, "s_dm_control");
  assert.equal(result.ok, true);
  assert.equal(result.mode, "schema");
  assert.deepEqual(result.schema, schemaRows);
  assert.match(result.sql, /report_schema\/s_dm_control/);
});

test("data mode validates year and source_table", async () => {
  await assert.rejects(() => runHdcApiTool({ source_table: "s_x", year: "2026" }, {}), /Buddhist year/);
  await assert.rejects(() => runHdcApiTool({ source_table: "s_x; DROP", year: "2569" }, {}), /plain table name/);
  await assert.rejects(() => runHdcApiTool({}, {}), /search.*source_table|source_table.*search/);
});

test("userMentionedHdc detects central-HDC questions in the latest user message", () => {
  assert.equal(userMentionedHdc([{ role: "user", content: "ขอข้อมูลจาก HDC กลาง" }]), true);
  assert.equal(userMentionedHdc([{ role: "user", content: "ดึงจาก opendata กระทรวง" }]), true);
  assert.equal(userMentionedHdc([{ role: "user", content: "นับประชากรในเครื่อง" }]), false);
});

test("chat route wires the hdc-api-tool", () => {
  const routeSource = readFileSync(new URL("../app/api/ai/chat/route.js", import.meta.url), "utf8");
  assert.match(routeSource, /HDC_API_TOOL/);
  assert.match(routeSource, /userMentionedHdc/);
  assert.match(routeSource, /runHdcApiTool\(parseToolArguments\(toolCall\)\)/);
  assert.ok(HDC_API_TOOL_NAME === "hdc-api-tool");
});
