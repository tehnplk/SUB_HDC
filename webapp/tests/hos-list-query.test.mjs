import assert from "node:assert/strict";
import test from "node:test";

import { getHospInfoMap, getHospNameMap } from "../lib/hos-list-query.mjs";

test("getHospNameMap maps hospcode to hospname_short and skips empty names", async () => {
  const conn = {
    async query() {
      return [[
        { hospcode: "07584", hospname_short: "สอน.บ้านกลาง" },
        { hospcode: "11251", hospname_short: "รพ.วังทอง" },
        { hospcode: "99999", hospname_short: null }, // ไม่มีชื่อย่อ — ต้องไม่ใส่ลง map
      ]];
    },
  };

  const map = await getHospNameMap(conn);
  assert.equal(map["07584"], "สอน.บ้านกลาง");
  assert.equal(map["11251"], "รพ.วังทอง");
  assert.equal("99999" in map, false);
});

test("getHospNameMap returns empty map when c_hospital table is missing", async () => {
  // ไซต์เก่าที่ยังไม่โหลด lookup — query โยน ER_NO_SUCH_TABLE ต้องไม่ทำหน้า hos-list พัง
  const conn = {
    async query() {
      const error = new Error("Table 'sub_hdc.c_hospital' doesn't exist");
      error.code = "ER_NO_SUCH_TABLE";
      throw error;
    },
  };

  assert.deepEqual(await getHospNameMap(conn), {});
});

test("getHospInfoMap normalizes affiliation and hospital names", async () => {
  const conn = {
    async query() {
      return [[
        { hospcode: "07584", hospname_short: "สอน.บ้านกลาง", affiliation: "สธ." },
        { hospcode: "99999", hospname_short: "ทดสอบ", affiliation: "-" },
      ]];
    },
  };

  assert.deepEqual(await getHospInfoMap(conn), {
    "07584": { hospname: "สอน.บ้านกลาง", affiliation: "สธ." },
    "99999": { hospname: "ทดสอบ", affiliation: "" },
  });
});
