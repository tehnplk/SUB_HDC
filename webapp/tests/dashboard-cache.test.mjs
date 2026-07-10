import assert from "node:assert/strict";
import test from "node:test";

import {
  CACHED_FILES,
  CACHE_TTL_SECONDS,
  hosListCacheKey,
  isCachedFile,
} from "../lib/dashboard-cache.mjs";

test("CACHED_FILES is exactly the large files the user chose", () => {
  assert.deepEqual(
    [...CACHED_FILES].sort(),
    [
      "charge_ipd",
      "charge_opd",
      "diagnosis_ipd",
      "diagnosis_opd",
      "drug_ipd",
      "drug_opd",
      "labfu",
    ]
  );
});

test("isCachedFile only matches the cached files, not fast files like service", () => {
  assert.equal(isCachedFile("charge_opd"), true);
  assert.equal(isCachedFile("diagnosis_ipd"), true);
  assert.equal(isCachedFile("service"), false);
  assert.equal(isCachedFile("person"), false);
  assert.equal(isCachedFile(""), false);
});

test("hosListCacheKey binds file and fiscal-year label", () => {
  assert.equal(hosListCacheKey("charge_opd", "2569"), "hos:charge_opd:2569");
});

test("cache TTL matches the 24h summarize interval", () => {
  assert.equal(CACHE_TTL_SECONDS, 24 * 60 * 60);
});
