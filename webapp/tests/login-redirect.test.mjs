import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loginSource = readFileSync(new URL("../app/login/page.js", import.meta.url), "utf8");
const healthIdSource = readFileSync(new URL("../app/api/auth/healthid/route.js", import.meta.url), "utf8");

test("default login redirects to the HDC population comparison page", () => {
  assert.match(loginSource, /const DEFAULT_CALLBACK_URL = "\/import-check\/compare-hdc-person"/);
  assert.match(healthIdSource, /const DEFAULT_CALLBACK_URL = "\/import-check\/compare-hdc-person"/);
  assert.match(loginSource, /const callbackUrl = localCallbackUrl\(formData\.get\("callbackUrl"\)\);/);
  assert.match(loginSource, /redirectTo: callbackUrl/);
  assert.match(healthIdSource, /redirectTo: callbackUrl/);
  assert.match(loginSource, /!callbackUrl\.startsWith\("\/\/"\)/);
  assert.match(loginSource, /!callbackUrl\.includes\("\\\\"\)/);
});
