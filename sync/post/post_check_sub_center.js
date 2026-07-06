const TARGET_URL = process.env.SYNC_TARGET_URL || "https://subhdc.plkhealth.go.th/api/data-sync-in";

function buildPayload() {
  return {
    sub_center_name: process.env.CENTER_NAME || "",
    topic: "check",
    live: true,
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
