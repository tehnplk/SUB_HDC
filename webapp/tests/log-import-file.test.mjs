import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const logImport = require("../lib/log-import-file.js");
const { STATUS } = logImport;

// fake mysql2 connection: บันทึก (sql, params) ทุกครั้ง แล้วคืนผลตามลำดับที่เตรียมไว้
function fakeConn(...results) {
  const calls = [];
  const run = async (sql, params) => {
    calls.push({ sql, params });
    return results.length ? results.shift() : [{ affectedRows: 1, insertId: 0 }];
  };
  return { calls, execute: run, query: run };
}

test("status constants keep the real (misspelled) DB values in one place", () => {
  assert.equal(STATUS.FAILED, "not_complate");
  assert.equal(STATUS.FAILED_LEGACY, "no_complete");
  assert.equal(logImport.isFailedStatus("not_complate"), true);
  assert.equal(logImport.isFailedStatus("no_complete"), true);
  assert.equal(logImport.isFailedStatus("complete"), false);
});

test("createPending inserts a pending row and returns its id", async () => {
  const conn = fakeConn([{ insertId: 42 }]);
  assert.equal(await logImport.createPending(conn, "a.zip", 2048), 42);
  assert.match(conn.calls[0].sql, /^INSERT INTO `log_import_file`/);
  assert.deepEqual(conn.calls[0].params, ["a.zip", 2048, "pending"]);
});

test("getFileName returns null when the row is gone", async () => {
  assert.equal(await logImport.getFileName(fakeConn([[{ file_name: "x.zip" }]]), 1), "x.zip");
  assert.equal(await logImport.getFileName(fakeConn([[]]), 1), null);
});

test("transitions: processing clears finish, complete and failed stamp it", async () => {
  const conn = fakeConn();
  await logImport.markProcessing(conn, 7);
  await logImport.setProgress(conn, 7, 55);
  await logImport.markComplete(conn, 7, "home > row 3");
  await logImport.markFailed(conn, 7, "boom");

  const [processing, progress, complete, failed] = conn.calls;
  assert.match(processing.sql, /`finish_date_time` = NULL/);
  assert.deepEqual(processing.params, ["processing", 7]);
  assert.deepEqual(progress.params, [55, 7]);
  assert.match(complete.sql, /`finish_date_time` = CURRENT_TIMESTAMP/);
  assert.deepEqual(complete.params, ["complete", "home > row 3", 7]);
  assert.deepEqual(failed.params.slice(0, 3), ["not_complate", "boom", 7]);
});

test("markFailed never overwrites a row that already finished", async () => {
  const conn = fakeConn([{ affectedRows: 0 }]);
  assert.equal(await logImport.markFailed(conn, 7, "late"), false);
  assert.match(conn.calls[0].sql, /`finish_date_time` IS NULL/);
  assert.deepEqual(conn.calls[0].params.slice(3), ["pending", "processing"]);
});

test("requeue resets the row to a fresh pending attempt", async () => {
  const conn = fakeConn();
  await logImport.requeue(conn, 9);
  const { sql, params } = conn.calls[0];
  assert.deepEqual(params, ["pending", 9]);
  assert.match(sql, /`import_date_time` = CURRENT_TIMESTAMP/);
  assert.match(sql, /`finish_date_time` = NULL/);
  assert.match(sql, /`progress_percent` = NULL/);
  assert.match(sql, /`not_complete_msg` = NULL/);
});

test("sweepOrphans marks only stale rows that have no queue file or active worker", async () => {
  const conn = fakeConn([[{ id: 1 }, { id: 2 }, { id: 3 }]], [{ affectedRows: 1 }]);
  const recovered = await logImport.sweepOrphans(conn, 30, new Set([1, 3]));

  assert.equal(recovered, 1);
  assert.deepEqual(conn.calls[0].params, ["pending", "processing", 30]);
  assert.match(conn.calls[1].sql, /WHERE `id` IN \(\?\)/);
  assert.deepEqual(conn.calls[1].params, ["not_complate", 2, "pending", "processing"]);
});

test("sweepOrphans issues no UPDATE when every stale row is still queued", async () => {
  const conn = fakeConn([[{ id: 5 }]]);
  assert.equal(await logImport.sweepOrphans(conn, 30, new Set([5])), 0);
  assert.equal(conn.calls.length, 1);
});

test("isImporting is true only while pending/processing rows exist", async () => {
  const busy = fakeConn([[{ n: 2 }]]);
  assert.equal(await logImport.isImporting(busy), true);
  assert.deepEqual(busy.calls[0].params, ["pending", "processing"]);
  assert.equal(await logImport.isImporting(fakeConn([[{ n: 0 }]])), false);
});

test("listPage filters by tab and folds legacy failed statuses into the failed count", async () => {
  const conn = fakeConn(
    [[{ status: "complete", n: 4 }, { status: "not_complate", n: 2 }, { status: "no_complete", n: 1 }, { status: "processing", n: 1 }]],
    [[{ total: 3 }]],
    [[{ id: 10 }]]
  );
  const result = await logImport.listPage(conn, { tab: "failed", q: "abc", page: 2, pageSize: 20 });

  assert.deepEqual(result.counts, { success: 4, failed: 3, pending: 1 });
  assert.equal(result.total, 3);
  assert.deepEqual(result.rows, [{ id: 10 }]);
  assert.deepEqual(conn.calls[2].params, ["not_complate", "no_complete", "%abc%", "%abc%", 20, 20]);
  assert.match(conn.calls[2].sql, /ORDER BY id DESC/);
});
