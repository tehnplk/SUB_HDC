import assert from "node:assert/strict";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import AdmZip from "adm-zip";

import { POST } from "../app/api/upload-zip/route.js";

const nextConfigPath = path.resolve(process.cwd(), "next.config.mjs");

async function postFile(file) {
  const formData = new FormData();
  formData.set("file", file);
  return POST(
    new Request("http://localhost/api/upload-zip", {
      method: "POST",
      body: formData,
    })
  );
}

async function cleanupUpload(storedName) {
  if (!storedName) return;
  await unlink(path.join(process.cwd(), "tmp", "uploads", storedName)).catch(() => {});
}

test("upload rejects invalid zip content even when extension is .zip", async () => {
  const response = await postFile(
    new File([Buffer.from("not a zip")], "not-a-zip.zip", {
      type: "application/zip",
    })
  );
  const payload = await response.json();

  await cleanupUpload(payload.storedName);

  assert.equal(response.status, 400);
  assert.match(payload.error, /Invalid zip file/);
});

test("upload accepts readable zip content", async () => {
  const zip = new AdmZip();
  zip.addFile("F43/SERVICE.txt", Buffer.from("HOSPCODE|SEQ\n11251|1\n", "utf8"));
  const response = await postFile(
    new File([zip.toBuffer()], "valid.zip", {
      type: "application/zip",
    })
  );
  const payload = await response.json();

  await cleanupUpload(payload.storedName);

  assert.equal(response.status, 200);
  assert.equal(payload.originalName, "valid.zip");
  assert.equal(typeof payload.storedName, "string");
});

test("next config allows upload bodies up to 50mb", async () => {
  const source = await readFile(nextConfigPath, "utf8");

  assert.match(source, /proxyClientMaxBodySize:\s*"50mb"/);
});

test("upload rejects files over 50mb with payload too large", async () => {
  const response = await postFile(
    new File([Buffer.alloc(50 * 1024 * 1024 + 1)], "too-large.zip", {
      type: "application/zip",
    })
  );
  const payload = await response.json();

  await cleanupUpload(payload.storedName);

  assert.equal(response.status, 413);
  assert.match(payload.error, /Upload file size limit is 50MB/);
});
