const fs = require("node:fs");
const path = require("node:path");

const TARGET_URL = process.env.SYNC_TARGET_URL || "https://subhdc.plkhealth.go.th/api/data-sync-in";
const UPDATE_LOG_FILE = process.env.UPDATE_LOG_FILE || path.resolve(__dirname, "../../webapp/update_log.json");

function compareVersions(left, right) {
  const leftParts = String(left || "").split(".").map((part) => Number(part) || 0);
  const rightParts = String(right || "").split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function getMaxUpdateVersion(updateLog) {
  if (!Array.isArray(updateLog) || updateLog.length === 0) {
    return "";
  }

  return updateLog
    .map((item) => String(item?.version || "").trim())
    .filter(Boolean)
    .reduce((maxVersion, version) => (
      compareVersions(version, maxVersion) > 0 ? version : maxVersion
    ), "");
}

function readVersion() {
  const updateLog = JSON.parse(fs.readFileSync(UPDATE_LOG_FILE, "utf8"));
  return getMaxUpdateVersion(updateLog);
}

function buildPayload() {
  return {
    sub_center_name: process.env.CENTER_NAME || "",
    topic: "check",
    live: true,
    version: readVersion(),
    date_time_check: new Date().toISOString(),
  };
}

async function postToSsj(payload) {
  const response = await fetch(TARGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SSJ sync check failed ${response.status}: ${text}`);
  }

  return text;
}

async function main() {
  const payload = buildPayload();

  if (process.env.SYNC_DRY_RUN === "true") {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const responseText = await postToSsj(payload);
  console.log(JSON.stringify({ success: true, topic: payload.topic, response: responseText }));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
