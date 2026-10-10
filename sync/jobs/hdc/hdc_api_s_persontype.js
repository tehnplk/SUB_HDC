const { connectWithRetry } = require("../db");

// ดึงข้อมูล s_persontype จาก HDC opendata API (opendata.moph.go.th) ทั้งจังหวัด
// มาเก็บลงตาราง hdc_api_s_persontype แบบ full replace เฉพาะปีที่ดึง
const HDC_API_URL =
  process.env.HDC_API_URL || "https://opendata.moph.go.th/api/report_data";
const HDC_API_PROVINCE = String(process.env.HDC_API_PROVINCE || "65").trim();

// ปีงบประมาณไทย: ต.ค.–ก.ย. — ตั้งแต่ ต.ค. เป็นต้นไปนับเป็นปีถัดไป
// (เช่น ก.ค. 2026 → 2569, พ.ย. 2026 → 2570)
function currentThaiFiscalYear(now = new Date()) {
  const year = now.getFullYear() + 543;
  return String(now.getMonth() + 1 >= 10 ? year + 1 : year);
}

async function fetchPersontype(bYear) {
  const response = await fetch(HDC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableName: "s_persontype",
      year: bYear,
      province: HDC_API_PROVINCE,
      type: "json",
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`fetch HDC s_persontype failed ${response.status}: ${text}`);
  }

  const body = JSON.parse(text);
  if (!Array.isArray(body)) {
    throw new Error(`unexpected HDC s_persontype response: ${text.slice(0, 300)}`);
  }
  return body;
}

function requiredText(row, name) {
  const value = String(row?.[name] ?? "").trim();
  if (!value) throw new Error(`HDC s_persontype row requires ${name}`);
  return value;
}

function countValue(row, name) {
  const value = row?.[name];
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`invalid ${name}: ${value}`);
  return parsed;
}

const COUNT_COLUMNS = [
  "type1", "type2", "type3", "type4", "type5",
  "type1c", "type2c", "type3c", "type4c", "type5c",
];

function normalizeRow(row) {
  return [
    requiredText(row, "b_year"),
    requiredText(row, "hospcode"),
    String(row?.areacode ?? "").trim() || null,
    ...COUNT_COLUMNS.map((name) => countValue(row, name)),
    String(row?.date_com ?? "").trim() || null,
  ];
}

const INSERT_SQL = `
  INSERT INTO hdc_api_s_persontype
    (b_year, hospcode, areacode, ${COUNT_COLUMNS.join(", ")}, date_com)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// full replace เฉพาะปีที่ดึง: DELETE แถวปีนั้นแล้ว insert ใหม่ทั้งชุดใน
// transaction เดียว (ปีเก่าคงไว้เป็นประวัติ) — payload ว่างถือว่า API
// ผิดปกติ ไม่ล้างข้อมูลเดิมทิ้ง
async function savePersontype(connection, bYear, rows) {
  if (!rows.length) {
    throw new Error(
      `HDC s_persontype payload is empty; refusing to clear hdc_api_s_persontype for ${bYear}`
    );
  }
  await connection.beginTransaction();
  try {
    await connection.execute("DELETE FROM hdc_api_s_persontype WHERE b_year = ?", [bYear]);
    for (const row of rows) {
      await connection.execute(INSERT_SQL, normalizeRow(row));
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const bYear = String(process.env.HDC_API_YEAR || "").trim() || currentThaiFiscalYear();
  const rows = await fetchPersontype(bYear);
  if (process.env.SYNC_DRY_RUN === "true") {
    console.log(JSON.stringify({ success: true, b_year: bYear, row_count: rows.length }));
    return;
  }

  const connection = await connectWithRetry();
  try {
    await savePersontype(connection, bYear, rows);
    console.log(JSON.stringify({ success: true, b_year: bYear, row_count: rows.length }));
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { COUNT_COLUMNS, INSERT_SQL, currentThaiFiscalYear, normalizeRow, savePersontype };
