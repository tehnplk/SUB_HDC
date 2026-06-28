import assert from "node:assert/strict";
import test from "node:test";

import {
  createFileIdentity,
  createFileKey,
  fileLabel,
  summarizeImportResults,
} from "../lib/zip-import-client.mjs";

const file = { name: "F43.zip", size: 2048, lastModified: 1234 };

test("fileLabel formats file size in KB", () => {
  assert.equal(fileLabel(file), "F43.zip (2 KB)");
});

test("createFileKey stays unique for duplicate file selections", () => {
  assert.notEqual(createFileKey(file, 0, 1000), createFileKey(file, 1, 1000));
});

test("createFileIdentity stays stable for duplicate file detection", () => {
  assert.equal(createFileIdentity(file), createFileIdentity({ ...file }));
  assert.notEqual(createFileIdentity(file), createFileIdentity({ ...file, size: 4096 }));
});

test("summarizeImportResults reports mixed import outcomes", () => {
  assert.equal(
    summarizeImportResults([
      { ok: true },
      { ok: false },
      { ok: true },
    ]),
    "นำเข้าสำเร็จ 2 ไฟล์, ล้มเหลว 1 ไฟล์"
  );
});

test("summarizeImportResults reports all successful imports", () => {
  assert.equal(
    summarizeImportResults([{ ok: true }, { ok: true }]),
    "นำเข้าทั้งหมดเสร็จสิ้น ✓"
  );
});
