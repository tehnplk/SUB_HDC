import { createDbConnection } from "@/lib/db";
import { requireApiJwt } from "@/lib/api-auth.mjs";
import {
  MONTHS,
  buildMonthlyCountExpressions,
  chooseMonthlyDateColumn,
  chooseSelectedFile,
  datePrefixExpression,
  getCurrentFiscalYearAd,
  getFiscalYearRange,
  normalizeFiscalYear,
  quoteIdentifier,
  toFiscalYearLabel,
} from "@/lib/dashboard-data.mjs";

export const runtime = "nodejs";

async function getTableColumns(conn, tableName) {
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  return rows.map((row) => row.COLUMN_NAME);
}

async function getFiscalYears(conn, tableName, dateColumn) {
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

async function getMonthlyRows(conn, tableName, dateColumn, fiscalYearAd) {
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

async function getTotalRows(conn, tableName) {
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

export async function GET(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;
  try {
    const url = new URL(request.url);
    conn = await createDbConnection();

    const isSummary = url.searchParams.get("summary") === "true";
    if (isSummary) {
      const [fileRows] = await conn.query("SELECT file_name FROM c_file ORDER BY file_name");
      const filesSummary = await Promise.all(
        fileRows.map(async (row) => {
          const [cntRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${row.file_name}\``);
          return {
            filename: row.file_name,
            row_count: Number(cntRows[0].cnt || 0),
          };
        })
      );

      const totalFiles = filesSummary.length;
      const filesWithData = filesSummary.filter((f) => f.row_count > 0).length;
      const totalRows = filesSummary.reduce((sum, f) => sum + f.row_count, 0);

      return Response.json({
        totalFiles,
        filesWithData,
        totalRows,
        files: filesSummary,
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    const isLogImport = url.searchParams.get("logImport") === "true";
    if (isLogImport) {
      const [rows] = await conn.query(
        "SELECT id, file_name, import_date_time FROM log_import_file ORDER BY id DESC LIMIT 500"
      );
      return Response.json({
        rows: rows.map((r) => ({
          id: Number(r.id),
          file_name: r.file_name,
          import_date_time: r.import_date_time,
        })),
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    const isQuality = url.searchParams.get("quality") === "true";
    if (isQuality) {
      const [hospcodeRows] = await conn.query("SELECT DISTINCT hospcode FROM data_correct WHERE hospcode IS NOT NULL AND hospcode != '' ORDER BY hospcode");
      const [tablenameRows] = await conn.query("SELECT DISTINCT tablename FROM data_correct WHERE tablename IS NOT NULL AND tablename != '' ORDER BY tablename");

      const requestedHospcode = url.searchParams.get("hospcode");
      const requestedTablename = url.searchParams.get("tablename");

      let queryParams = [];
      let queryConditions = [];
      if (requestedHospcode) {
        queryConditions.push("hospcode = ?");
        queryParams.push(requestedHospcode);
      }
      if (requestedTablename) {
        queryConditions.push("tablename = ?");
        queryParams.push(requestedTablename);
      }

      const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(" AND ")}` : "";

      const [rows] = await conn.query(
        `SELECT hospcode, tablename, data_correct, d_update, log_import_id 
         FROM data_correct 
         ${whereClause} 
         ORDER BY d_update DESC`,
        queryParams
      );

      const [[{ uniqueHospcodes }]] = await conn.query("SELECT COUNT(DISTINCT hospcode) AS uniqueHospcodes FROM data_correct");
      const [[{ uniqueTablenames }]] = await conn.query("SELECT COUNT(DISTINCT tablename) AS uniqueTablenames FROM data_correct");

      return Response.json({
        rows: rows.map((r) => ({
          ...r,
          log_import_id: r.log_import_id ? Number(r.log_import_id) : null,
        })),
        hospcodes: hospcodeRows.map((r) => r.hospcode),
        tablenames: tablenameRows.map((r) => r.tablename),
        totalRows: rows.length,
        uniqueHospcodes: Number(uniqueHospcodes || 0),
        uniqueTablenames: Number(uniqueTablenames || 0),
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    const [fileRows] = await conn.query("SELECT file_name FROM c_file ORDER BY file_name");
    const files = fileRows.map((row) => row.file_name);
    const requestedFile = url.searchParams.get("file");
    const selectedFile = chooseSelectedFile(files, requestedFile);

    if (!selectedFile) {
      return Response.json({
        files: [],
        selectedFile: "",
        selectedFiscalYear: "",
        fiscalYears: [],
        hasMonthly: false,
        dateColumn: null,
        months: MONTHS,
        rows: [],
        totalRows: 0,
      });
    }

    const columns = await getTableColumns(conn, selectedFile);
    const dateColumn = chooseMonthlyDateColumn(columns);
    const hasMonthly = Boolean(dateColumn);

    let fiscalYears = [];
    let selectedFiscalYear = "";
    let rows = [];

    if (hasMonthly) {
      const fiscalYearAds = await getFiscalYears(conn, selectedFile, dateColumn);
      const fallbackYear = fiscalYearAds[0] || getCurrentFiscalYearAd();
      const requestedFiscalYear = normalizeFiscalYear(url.searchParams.get("fiscalYear")) || fallbackYear;
      const selectedFiscalYearAd = fiscalYearAds.includes(requestedFiscalYear)
        ? requestedFiscalYear
        : fallbackYear;

      fiscalYears = fiscalYearAds.map((year) => ({
        value: toFiscalYearLabel(year),
        label: toFiscalYearLabel(year),
      }));
      selectedFiscalYear = toFiscalYearLabel(selectedFiscalYearAd);
      rows = await getMonthlyRows(conn, selectedFile, dateColumn, selectedFiscalYearAd);
    } else {
      rows = await getTotalRows(conn, selectedFile);
    }

    const totalRows = rows.reduce((sum, row) => {
      if (!hasMonthly) return sum + row.total;
      return sum + MONTHS.reduce((monthSum, month) => monthSum + row[month.key], 0);
    }, 0);

    return Response.json({
      files: files.map((fileName) => ({ fileName })),
      selectedFile,
      selectedFiscalYear,
      fiscalYears,
      hasMonthly,
      dateColumn,
      months: MONTHS,
      rows,
      totalRows,
      centerName: process.env.CENTER_NAME || "เมือง",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
