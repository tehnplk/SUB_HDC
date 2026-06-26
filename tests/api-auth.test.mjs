import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_COOKIE_NAME,
  createApiJwt,
  requireApiJwt,
  verifyApiJwt,
} from "../lib/api-auth.mjs";

test("requireApiJwt rejects a GET request without the app JWT cookie", async () => {
  const response = await requireApiJwt(
    new Request("http://localhost/api/dashboard"),
    { secret: "test-secret" }
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("requireApiJwt accepts a valid app JWT cookie", async () => {
  const token = await createApiJwt({ secret: "test-secret", now: 1000 });
  const response = await requireApiJwt(
    new Request("http://localhost/api/dashboard", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    }),
    { secret: "test-secret", now: 1000 }
  );

  assert.equal(response, null);
});

test("verifyApiJwt rejects expired app JWTs", async () => {
  const token = await createApiJwt({ secret: "test-secret", now: 1000, ttlSeconds: 10 });

  assert.equal(await verifyApiJwt(token, { secret: "test-secret", now: 12000 }), false);
});

test("JWT helpers use JWT_KEY separately from ENCRYPT_KEY", async () => {
  const previousJwtKey = process.env.JWT_KEY;
  const previousEncryptKey = process.env.ENCRYPT_KEY;
  const previousSecretKey = process.env.SECRET_KEY;
  try {
    process.env.JWT_KEY = "jwt-test-secret";
    process.env.ENCRYPT_KEY = "encrypt-test-secret";
    delete process.env.SECRET_KEY;

    const token = await createApiJwt({ now: 1000 });

    assert.equal(await verifyApiJwt(token, { now: 1000 }), true);
    assert.equal(await verifyApiJwt(token, { secret: "jwt-test-secret", now: 1000 }), true);
    assert.equal(await verifyApiJwt(token, { secret: "encrypt-test-secret", now: 1000 }), false);
  } finally {
    if (previousJwtKey === undefined) delete process.env.JWT_KEY;
    else process.env.JWT_KEY = previousJwtKey;
    if (previousEncryptKey === undefined) delete process.env.ENCRYPT_KEY;
    else process.env.ENCRYPT_KEY = previousEncryptKey;
    if (previousSecretKey === undefined) delete process.env.SECRET_KEY;
    else process.env.SECRET_KEY = previousSecretKey;
  }
});
