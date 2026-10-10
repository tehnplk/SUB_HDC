import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { deleteExpiredFailed } = require("../lib/log-import-file.js");

test("deleteExpiredFailed deletes only failed rows older than five days", async () => {
  const executed = [];
  const connection = {
    async execute(sql, values) {
      executed.push({ sql, values });
      return [{ affectedRows: 2 }];
    },
  };

  const deleted = await deleteExpiredFailed(connection);

  assert.equal(deleted, 2);
  assert.equal(executed.length, 1);
  assert.deepEqual(executed[0].values, ["not_complate", "no_complete"]);
  for (const preservedStatus of ["pending", "processing", "complete"]) {
    assert.equal(executed[0].values.includes(preservedStatus), false);
  }
  assert.match(executed[0].sql, /^DELETE FROM `log_import_file`/);
  assert.match(executed[0].sql, /`status` IN \(\?, \?\)/);
  assert.match(
    executed[0].sql,
    /`import_date_time` < DATE_SUB\(CURRENT_TIMESTAMP, INTERVAL 5 DAY\)/
  );
  assert.doesNotMatch(executed[0].sql, /pending|processing|complete/);
});
