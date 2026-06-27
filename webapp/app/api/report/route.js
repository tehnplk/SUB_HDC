import { requireApiJwt } from "@/lib/api-auth.mjs";
import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

function normalizeReportSql(sql) {
  const normalized = String(sql || "").trim().replace(/;+\s*$/, "");
  if (!/^select\s+/i.test(normalized)) {
    throw new Error("Only SELECT report SQL is allowed");
  }
  if (/;/.test(normalized)) {
    throw new Error("Report SQL must contain one statement");
  }
  if (/\b(insert|update|delete|drop|truncate|alter|create|replace)\b/i.test(normalized)) {
    throw new Error("Report SQL must be read-only");
  }
  return normalized;
}

async function getReport(conn, id) {
  const [rows] = await conn.query(
    "SELECT id, name, `sql`, date_update FROM report WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

export async function GET(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;
  try {
    conn = await createDbConnection();
    const [rows] = await conn.query(
      "SELECT id, name, date_update FROM report ORDER BY id"
    );

    return Response.json({
      rows: rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        date_update: row.date_update,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}

export async function POST(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;
  try {
    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Invalid report id" }, { status: 400 });
    }

    conn = await createDbConnection();
    const report = await getReport(conn, id);
    if (!report) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    const sql = normalizeReportSql(report.sql);
    const [rows, fields] = await conn.query(`SELECT * FROM (${sql}) AS report_result LIMIT 500`);
    const columns = fields.map((field) => field.name);

    return Response.json({
      report: {
        id: Number(report.id),
        name: report.name,
        date_update: report.date_update,
      },
      columns,
      rows,
      limited: rows.length >= 500,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
