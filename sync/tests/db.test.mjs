import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getDbConfig, connectWithRetry } = require("../jobs/db.js");

test("getDbConfig defaults to the host-side MariaDB port and reads env overrides", () => {
  assert.deepEqual(getDbConfig({}), {
    host: "host.docker.internal",
    port: 3308,
    user: "root",
    password: "",
    database: "sub_hdc",
    charset: "utf8mb4",
  });
  const config = getDbConfig({ DB_HOST: "mariadb", DB_PORT: "3306", DB_DATABASE: "x" });
  assert.equal(config.host, "mariadb");
  assert.equal(config.port, 3306);
  assert.equal(config.database, "x");
});

test("getDbConfig rejects a non-numeric DB_PORT", () => {
  assert.throws(() => getDbConfig({ DB_PORT: "abc" }), /DB_PORT/);
});

test("connectWithRetry retries until a connection succeeds, then gives up with the last error", async () => {
  let calls = 0;
  const conn = await connectWithRetry({
    retries: 3,
    delayMs: 0,
    connect: async () => {
      calls += 1;
      if (calls < 2) throw new Error("not yet");
      return "conn";
    },
  });
  assert.equal(conn, "conn");
  assert.equal(calls, 2);

  await assert.rejects(
    connectWithRetry({ retries: 2, delayMs: 0, connect: async () => { throw new Error("down"); } }),
    /down/,
  );
});
