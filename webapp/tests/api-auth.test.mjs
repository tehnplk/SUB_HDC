import assert from "node:assert/strict";
import test from "node:test";

import { createApiJwt, verifyApiJwt } from "../lib/api-auth.mjs";

test("verifyApiJwt accepts a fresh token and rejects expired or wrongly signed ones", async () => {
  const token = await createApiJwt({ secret: "test-secret", now: 1000, ttlSeconds: 10 });

  assert.equal(await verifyApiJwt(token, { secret: "test-secret", now: 1000 }), true);
  assert.equal(await verifyApiJwt(token, { secret: "test-secret", now: 12000 }), false);
  assert.equal(await verifyApiJwt(token, { secret: "other-secret", now: 1000 }), false);
});

test("JWT helpers use JWT_KEY separately from ENCRYPT_KEY", async () => {
  const previousJwtKey = process.env.JWT_KEY;
  const previousEncryptKey = process.env.ENCRYPT_KEY;
  try {
    process.env.JWT_KEY = "jwt-test-secret";
    process.env.ENCRYPT_KEY = "encrypt-test-secret";

    const token = await createApiJwt({ now: 1000 });

    assert.equal(await verifyApiJwt(token, { now: 1000 }), true);
    assert.equal(await verifyApiJwt(token, { secret: "encrypt-test-secret", now: 1000 }), false);
  } finally {
    if (previousJwtKey === undefined) delete process.env.JWT_KEY;
    else process.env.JWT_KEY = previousJwtKey;
    if (previousEncryptKey === undefined) delete process.env.ENCRYPT_KEY;
    else process.env.ENCRYPT_KEY = previousEncryptKey;
  }
});
