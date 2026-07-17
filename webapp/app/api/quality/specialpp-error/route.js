import { requireApiJwt } from "@/lib/api-auth.mjs";
import { createDbConnection } from "@/lib/db";
import { getHospInfoMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;

  try {
    conn = await createDbConnection();
    const { searchParams } = new URL(request.url);
    const requestedYear = Number(searchParams.get("fiscalYear"));
    const requestedHospcode = searchParams.get("hospcode") || "";
    const requestedAffiliation = searchParams.get("affiliation") || "";
    const detailsRequested = searchParams.get("details") === "1";
    const hospitalInfo = await getHospInfoMap(conn, { affiliationSource: "depShort" });

    const [yearRows] = await conn.query(
      "SELECT DISTINCT fiscal_year FROM `t_specialpp_error` ORDER BY fiscal_year DESC"
    );
    const fiscalYears = yearRows.map((row) => Number(row.fiscal_year)).filter(Boolean);
    const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);
    let transformedAt = null;
    try {
      const [[latestTransform]] = await conn.query(
        `SELECT finish_at FROM \`log_transform\`
         WHERE transform_sql_task = 't_specialpp_error.sql'
           AND finish_at IS NOT NULL
         ORDER BY finish_at DESC
         LIMIT 1`
      );
      transformedAt = latestTransform?.finish_at || null;
    } catch {
      // Older installations may not have log_transform yet.
    }

    const [hospRows] = await conn.query(
      "SELECT DISTINCT hospcode FROM `t_specialpp_error` WHERE fiscal_year = ? ORDER BY hospcode",
      [fiscalYear]
    );
    const allHospitals = hospRows.map((row) => ({
      hospcode: row.hospcode,
      hospname: hospitalInfo[row.hospcode]?.hospname || "",
      affiliation: hospitalInfo[row.hospcode]?.affiliation || "",
    }));
    const affiliations = [...new Set(allHospitals.map((hospital) => hospital.affiliation).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "th"));
    const hospitals = requestedAffiliation
      ? allHospitals.filter((hospital) => hospital.affiliation === requestedAffiliation)
      : allHospitals;

    if (requestedHospcode && !allHospitals.some((hospital) => hospital.hospcode === requestedHospcode)) {
      return Response.json({ error: "ไม่พบหน่วยบริการ" }, { status: 400 });
    }
    if (requestedHospcode && requestedAffiliation && hospitalInfo[requestedHospcode]?.affiliation !== requestedAffiliation) {
      return Response.json({ error: "หน่วยบริการไม่อยู่ในสังกัดที่เลือก" }, { status: 400 });
    }

    const where = ["fiscal_year = ?"];
    const values = [fiscalYear];
    if (requestedHospcode) {
      where.push("hospcode = ?");
      values.push(requestedHospcode);
    }

    if (detailsRequested) {
      if (!requestedHospcode) {
        return Response.json({ error: "ต้องระบุรหัสหน่วยบริการ" }, { status: 400 });
      }
      const [rawRows] = await conn.query(
        `SELECT hospcode, fiscal_year, pid, seq, date_serve, ppspecial, ppspecial_name, error_type
         FROM \`t_specialpp_error\`
         WHERE ${where.join(" AND ")}
         ORDER BY date_serve DESC, pid, seq`,
        values
      );
      const rows = rawRows.map((row) => ({
        ...row,
        hospname: hospitalInfo[row.hospcode]?.hospname || "",
        affiliation: hospitalInfo[row.hospcode]?.affiliation || "",
      }));
      return Response.json({ rows, count: rows.length, transformedAt });
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode,
        SUM(error_type = 'not_standard') AS not_standard,
        SUM(error_type = 'cancelled') AS cancelled,
        COUNT(*) AS total
       FROM \`t_specialpp_error\`
       WHERE ${where.join(" AND ")}
       GROUP BY hospcode
       ORDER BY total DESC, hospcode`,
      values
    );
    const rows = rawRows
      .filter((row) => !requestedAffiliation || hospitalInfo[row.hospcode]?.affiliation === requestedAffiliation)
      .map((row) => ({
        hospcode: row.hospcode,
        hospname: hospitalInfo[row.hospcode]?.hospname || "",
        affiliation: hospitalInfo[row.hospcode]?.affiliation || "",
        not_standard: Number(row.not_standard),
        cancelled: Number(row.cancelled),
        total: Number(row.total),
      }));

    return Response.json({
      fiscalYears,
      fiscalYear,
      affiliations,
      hospitals,
      rows,
      notStandard: rows.reduce((sum, row) => sum + row.not_standard, 0),
      cancelled: rows.reduce((sum, row) => sum + row.cancelled, 0),
      count: rows.reduce((sum, row) => sum + row.total, 0),
      transformedAt,
    });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีตารางสรุป t_specialpp_error กรุณารอ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
