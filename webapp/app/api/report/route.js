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

function reportPayload(report) {
  return {
    id: Number(report.id),
    name: report.name,
    sql: report.sql,
    date_update: report.date_update,
  };
}

export async function GET(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;
  try {
    conn = await createDbConnection();
    const [rows] = await conn.query(
      "SELECT id, name, `sql`, date_update FROM report ORDER BY id"
    );

    return Response.json({
      rows: rows.map(reportPayload),
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

export async function PATCH(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;
  try {
    const body = await request.json();
    const id = Number(body?.id);
    const name = String(body?.name || "").trim();
    const sql = normalizeReportSql(body?.sql);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Invalid report id" }, { status: 400 });
    }
    if (!name) {
      return Response.json({ error: "Report name is required" }, { status: 400 });
    }

    conn = await createDbConnection();
    const [result] = await conn.query(
      "UPDATE report SET name = ?, `sql` = ?, date_update = NOW() WHERE id = ?",
      [name, sql, id]
    );

    if (!result.affectedRows) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await getReport(conn, id);
    return Response.json({ report: reportPayload(report) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}

export async function PUT(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const sql = normalizeReportSql(body?.sql);

    if (!name) {
      return Response.json({ error: "Report name is required" }, { status: 400 });
    }

    conn = await createDbConnection();
    const [result] = await conn.query(
      "INSERT INTO report (name, `sql`) VALUES (?, ?)",
      [name, sql]
    );

    const report = await getReport(conn, result.insertId);
    return Response.json({ report: reportPayload(report) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}

export async function DELETE(request) {
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
    const [result] = await conn.query("DELETE FROM report WHERE id = ?", [id]);

    if (!result.affectedRows) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    return Response.json({ deleted: true, id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
