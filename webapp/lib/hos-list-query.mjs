// Query helpers ของหน้า /dashboard/hos-list ที่ทั้ง API route และ summarize
// container ใช้ร่วมกัน — สกัดออกมาจาก app/api/dashboard/route.js เพื่อให้ cache
// ที่ summarize เขียน กับที่ route อ่าน มาจาก query ตัวเดียวกันเป๊ะ (คอลัมน์/รูปแบบ
// rows ตรงกันเสมอ ไม่หลุด sync)
import {
  MONTHS,
  buildMonthlyCountExpressions,
  datePrefixExpression,
  getFiscalYearRange,
  quoteIdentifier,
} from "./dashboard-data.mjs";

export async function getTableColumns(conn, tableName) {
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  return rows.map((row) => row.COLUMN_NAME);
}

export async function getFiscalYears(conn, tableName, dateColumn) {
  const tableSql = quoteIdentifier(tableName);
  const dateSql = datePrefixExpression(dateColumn);
  const [rows] = await conn.query(
    `SELECT DISTINCT
       CASE
         WHEN CAST(SUBSTRING(${dateSql}, 5, 2) AS UNSIGNED) >= 10
           THEN CAST(SUBSTRING(${dateSql}, 1, 4) AS UNSIGNED) + 1
         ELSE CAST(SUBSTRING(${dateSql}, 1, 4) AS UNSIGNED)
       END AS fiscal_year_ad
     FROM ${tableSql}
     WHERE ${dateSql} REGEXP '^[0-9]{8}$'
       AND SUBSTRING(${dateSql}, 5, 2) BETWEEN '01' AND '12'
     ORDER BY fiscal_year_ad DESC`
  );

  return rows
    .map((row) => Number(row.fiscal_year_ad))
    .filter((year) => Number.isInteger(year) && year > 0);
}

export async function getMonthlyRows(conn, tableName, dateColumn, fiscalYearAd) {
  const tableSql = quoteIdentifier(tableName);
  const dateSql = datePrefixExpression(dateColumn);
  const monthSql = buildMonthlyCountExpressions(dateColumn);
  const range = getFiscalYearRange(fiscalYearAd);

  const [rows] = await conn.query(
    `SELECT hospcode, ${monthSql}
     FROM ${tableSql}
     WHERE ${dateSql} REGEXP '^[0-9]{8}$'
       AND ${dateSql} >= ?
       AND ${dateSql} < ?
     GROUP BY hospcode
     ORDER BY hospcode`,
    [range.start, range.end]
  );

  return rows.map((row) => {
    const item = { hospcode: row.hospcode };
    for (const month of MONTHS) {
      item[month.key] = Number(row[month.key] || 0);
    }
    return item;
  });
}

// ชื่อย่อหน่วยบริการจาก lookup table/lookup/c_hospital — คืน {} ถ้าตารางยังไม่มี
// (ไซต์เก่าที่ยังไม่โหลดไฟล์ lookup) เพื่อให้หน้า hos-list ยังใช้งานได้ปกติ
// แค่ไม่มีชื่อกำกับ. ไม่ฝังชื่อลง Redis cache — merge ตอนตอบ response เสมอ
// เพื่อให้ cache shape เดิมไม่เปลี่ยน และแก้ชื่อใน c_hospital แล้วเห็นผลทันที
export async function getHospNameMap(conn) {
  try {
    const [rows] = await conn.query(
      "SELECT hospcode, hospname_short FROM c_hospital WHERE hospcode IS NOT NULL AND hospcode != ''"
    );
    const map = {};
    for (const row of rows) {
      if (row.hospname_short) map[row.hospcode] = row.hospname_short;
    }
    return map;
  } catch {
    return {};
  }
}

// ชื่อย่อ + สังกัดรายหน่วยบริการ โดยใช้ประเภทหน่วยบริการเป็นหลัก
// และ fallback ไปยัง dep_name สำหรับ lookup เก่าที่ยังไม่มี c_hostype ครบ
export async function getHospInfoMap(conn, { affiliationSource = "hostypeName" } = {}) {
  const affiliationExpression = affiliationSource === "depShort"
    ? "COALESCE(NULLIF(t.dep_short, ''), NULLIF(h.dep_name, ''))"
    : "COALESCE(NULLIF(t.hostype_name, ''), NULLIF(h.dep_name, ''))";

  try {
    const [rows] = await conn.query(
      `SELECT h.hospcode, h.hospname_short,
              ${affiliationExpression} AS affiliation
       FROM c_hospital h
       LEFT JOIN c_hostype t ON t.code = h.hostype_new
       WHERE h.hospcode IS NOT NULL AND h.hospcode != ''`
    );
    const map = {};
    for (const row of rows) {
      const affiliation = String(row.affiliation || "").trim();
      map[row.hospcode] = {
        hospname: row.hospname_short || "",
        affiliation: affiliation === "-" ? "" : affiliation,
      };
    }
    return map;
  } catch {
    return {};
  }
}

export async function getTotalRows(conn, tableName) {
  const [rows] = await conn.query(
    `SELECT hospcode, COUNT(*) AS total
     FROM ${quoteIdentifier(tableName)}
     GROUP BY hospcode
     ORDER BY hospcode`
  );

  return rows.map((row) => ({
    hospcode: row.hospcode,
    total: Number(row.total || 0),
  }));
}
