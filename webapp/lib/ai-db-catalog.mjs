import { getDbPool } from "./db.js";

// Compact snapshot of the database structure, injected as a system message so
// the model answers data questions without spending tool rounds on
// SHOW TABLES / DESCRIBE discovery. Cached; refreshed every 10 minutes.
export const DB_CATALOG_TTL_MS = 10 * 60 * 1000;

const catalogCache = { text: null, expires: 0 };

export function clearDbCatalogCache() {
  catalogCache.text = null;
  catalogCache.expires = 0;
}

export function formatDbCatalog(tableNames, summaryColumns) {
  const names = [...tableNames].sort();
  const summaryTables = names.filter((name) => /^[st]_/.test(name));
  const lookupTables = names.filter((name) => /^c_/.test(name));
  const systemTables = new Set(["schema_migrations"]);
  const rawTables = names.filter(
    (name) =>
      !/^([stc]|log|hdc_api|sql)_/.test(name) &&
      !systemTables.has(name)
  );

  const summaryLines = summaryTables.map((name) => {
    const columns = summaryColumns.get(name);
    return columns ? `${name}(${columns})` : name;
  });

  const parts = [
    "รายการตารางในฐานข้อมูลขณะนี้ (ใช้แทนการยิง SHOW TABLES/DESCRIBE):",
    summaryLines.length
      ? `ตารางสรุปจาก transform (ใช้ก่อนเสมอ): ${summaryLines.join("; ")}`
      : null,
    rawTables.length ? `ตาราง raw F43: ${rawTables.join(", ")}` : null,
    lookupTables.length ? `ตาราง lookup/master: ${lookupTables.join(", ")}` : null,
  ];

  return parts.filter(Boolean).join("\n");
}

export async function getDbCatalog(pool = getDbPool()) {
  if (catalogCache.text && Date.now() < catalogCache.expires) return catalogCache.text;

  const [tables] = await pool.query(
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"
  );
  const tableNames = tables.map((row) => String(row.table_name));

  const [columns] = await pool.query(
    "SELECT TABLE_NAME AS table_name, GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS cols FROM information_schema.columns WHERE table_schema = DATABASE() AND TABLE_NAME REGEXP '^[st]_' GROUP BY TABLE_NAME"
  );
  const summaryColumns = new Map(columns.map((row) => [String(row.table_name), String(row.cols)]));

  catalogCache.text = formatDbCatalog(tableNames, summaryColumns);
  catalogCache.expires = Date.now() + DB_CATALOG_TTL_MS;
  return catalogCache.text;
}
