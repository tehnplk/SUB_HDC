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
    const hospitalInfo = await getHospInfoMap(conn, { affiliationSource: "depShort" });

    const [yearRows] = await conn.query(
      "SELECT DISTINCT fiscal_year FROM `t_service_intype_error` ORDER BY fiscal_year DESC"
    );
    const fiscalYears = yearRows.map((row) => Number(row.fiscal_year)).filter(Boolean);
    const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);

    const [hospRows] = await conn.query(
      "SELECT DISTINCT hospcode FROM `t_service_intype_error` WHERE fiscal_year = ? ORDER BY hospcode",
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

    const where = ["fiscal_year = ?"];
    const values = [fiscalYear];
    if (requestedHospcode) {
      where.push("hospcode = ?");
      values.push(requestedHospcode);
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode, fiscal_year, pid, seq, date_serve, instype
       FROM \`t_service_intype_error\`
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY hospcode, date_serve, pid, seq`,
      values
    );
    const rows = rawRows
      .filter((row) => !requestedAffiliation || hospitalInfo[row.hospcode]?.affiliation === requestedAffiliation)
      .map((row) => ({
        ...row,
        hospname: hospitalInfo[row.hospcode]?.hospname || "",
        affiliation: hospitalInfo[row.hospcode]?.affiliation || "",
      }));

    return Response.json({ fiscalYears, fiscalYear, affiliations, hospitals, rows, count: rows.length });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีตารางสรุป t_service_intype_error กรุณารอ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
