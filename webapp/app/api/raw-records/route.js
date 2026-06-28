import { createDbConnection } from "@/lib/db";
import {
  chooseMonthlyDateColumn,
  datePrefixExpression,
  getFiscalYearRange,
  normalizeFiscalYear,
  quoteIdentifier,
} from "@/lib/dashboard-data.mjs";

export const runtime = "nodejs";

const EXCLUDED_COLUMNS = new Set(["cid_aes", "log_import_id"]);
const MAX_LIMIT = 500;

async function getTableColumns(conn, tableName) {
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  return rows.map((row) => row.COLUMN_NAME);
}

export async function GET(request) {
  let conn;
  try {
    const url = new URL(request.url);
    const file = url.searchParams.get("file");
    const hospcode = url.searchParams.get("hospcode");
    const monthValue = url.searchParams.get("monthValue");
    const fiscalYear = url.searchParams.get("fiscalYear");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "100", 10),
      MAX_LIMIT
    );
    const offset = (page - 1) * limit;

    if (!file || !hospcode) {
      return Response.json(
        { error: "Missing file or hospcode" },
        { status: 400 }
      );
    }

    const hasMonthFilter = monthValue && /^\d{2}$/.test(monthValue);

    conn = await createDbConnection();

    const [[fileRow]] = await conn.query(
      "SELECT 1 FROM c_file WHERE file_name = ?",
      [file]
    );
    if (!fileRow) {
      return Response.json({ error: "Unknown file" }, { status: 404 });
    }

    const allColumns = await getTableColumns(conn, file);
    const dateColumn = chooseMonthlyDateColumn(allColumns);
    const tableSql = quoteIdentifier(file);

    const columns = allColumns.filter((col) => !EXCLUDED_COLUMNS.has(col));
    const columnList = columns.map((col) => quoteIdentifier(col)).join(", ");

    let whereClause;
    let whereParams;

    if (dateColumn) {
      const fiscalYearAd = normalizeFiscalYear(fiscalYear);
      if (!fiscalYearAd) {
        return Response.json(
          { error: "Invalid fiscalYear" },
          { status: 400 }
        );
      }

      const range = getFiscalYearRange(fiscalYearAd);
      const dateSql = datePrefixExpression(dateColumn);

      const conditions = [
        "hospcode = ?",
        `${dateSql} REGEXP '^[0-9]{8}$'`,
        `${dateSql} >= ?`,
        `${dateSql} < ?`,
      ];

      const params = [hospcode, range.start, range.end];

      if (hasMonthFilter) {
        conditions.splice(1, 0, `SUBSTRING(${dateSql}, 5, 2) = ?`);
        params.splice(1, 0, monthValue);
      }

      whereClause = conditions.join(" AND ");
      whereParams = params;
    } else {
      whereClause = "hospcode = ?";
      whereParams = [hospcode];
    }

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM ${tableSql} WHERE ${whereClause}`,
      whereParams
    );

    const [rows] = await conn.query(
      `SELECT ${columnList} FROM ${tableSql} WHERE ${whereClause} ORDER BY hospcode LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    return Response.json({
      total: Number(total),
      page,
      limit,
      columns,
      rows,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
