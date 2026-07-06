const fs = require("node:fs");
const path = require("node:path");

const SYNC_PATH = "/api/data-sync-in";
const DEFAULT_BASE_URL = "https://subhdc.plkhealth.go.th";
const CONFIG_FILE = process.env.SYNC_BASE_URL_FILE || path.resolve(__dirname, "../config_base_url.json");

// ลำดับความสำคัญ: config_base_url.json > env SYNC_TARGET_URL > ค่า default
// ไฟล์ config ไม่ถูก track ใน git เพื่อให้แต่ละไซต์ตั้ง base URL ของตัวเองได้
function resolveTargetUrl() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    const baseUrl = String(config?.base_url || "").trim().replace(/\/+$/, "");
    if (baseUrl) return baseUrl + SYNC_PATH;
  } catch {
    // ไม่มีไฟล์หรืออ่านไม่ได้ ใช้ env/ค่า default แทน
  }
  return process.env.SYNC_TARGET_URL || DEFAULT_BASE_URL + SYNC_PATH;
}

module.exports = { resolveTargetUrl, SYNC_PATH, CONFIG_FILE };
