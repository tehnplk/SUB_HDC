import assert from "node:assert/strict";
import test from "node:test";
import { getDbConfig, withDb } from "../lib/db.js";

function fakePool() {
  const events = [];
  const conn = {
    query: async () => [[{ ok: 1 }]],
    release: () => events.push("release"),
    destroy: () => events.push("destroy"),
  };
  return { events, pool: { getConnection: async () => conn }, conn };
}

test("withDb hands fn a pooled connection, returns its result and releases it", async () => {
  const { events, pool, conn } = fakePool();
  const result = await withDb(async (received) => {
    assert.equal(received, conn);
    assert.deepEqual(events, []);
    return "value";
  }, { pool });
  assert.equal(result, "value");
  assert.deepEqual(events, ["release"]);
});

test("withDb propagates the error and destroys the connection instead of returning it to the pool", async () => {
  const { events, pool } = fakePool();
  const failure = new Error("boom");
  await assert.rejects(withDb(async () => { throw failure; }, { pool }), (error) => error === failure);
  assert.deepEqual(events, ["destroy"]);
});

test("withDb does not touch a connection it never obtained", async () => {
  const pool = { getConnection: async () => { throw new Error("pool exhausted"); } };
  let called = false;
  await assert.rejects(withDb(async () => { called = true; }, { pool }), /pool exhausted/);
  assert.equal(called, false);
});

test("getDbConfig defaults and env overrides", () => {
  assert.deepEqual(getDbConfig({}), {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "sub_hdc",
    charset: "utf8mb4",
  });
  const config = getDbConfig({ DB_HOST: "mariadb", DB_PORT: "3308", DB_USER: "u", DB_PASSWORD: "p", DB_DATABASE: "d" });
  assert.deepEqual(
    [config.host, config.port, config.user, config.password, config.database],
    ["mariadb", 3308, "u", "p", "d"],
  );
});

test("getDbConfig rejects an invalid DB_PORT", () => {
  assert.throws(() => getDbConfig({ DB_PORT: "abc" }), /DB_PORT/);
  assert.throws(() => getDbConfig({ DB_PORT: "-1" }), /DB_PORT/);
});
