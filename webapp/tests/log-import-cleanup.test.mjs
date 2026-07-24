import assert from "node:assert/strict";
import test from "node:test";

import { deleteExpiredFailedLogImports } from "../lib/log-import.mjs";

test("deleteExpiredFailedLogImports deletes only failed rows older than five days", async () => {
  const executed = [];
  const connection = {
    async execute(sql, values) {
      executed.push({ sql, values });
      return [{ affectedRows: 2 }];
    },
  };

  const deleted = await deleteExpiredFailedLogImports(connection);

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
