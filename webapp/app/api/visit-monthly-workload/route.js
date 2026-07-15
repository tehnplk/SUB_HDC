import { createDbConnection } from "@/lib/db";
import { getHospInfoMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

const MONTHS = [
  { key: "oct", label: "ต.ค." },
  { key: "nov", label: "พ.ย." },
  { key: "dec", label: "ธ.ค." },
  { key: "jan", label: "ม.ค." },
  { key: "feb", label: "ก.พ." },
  { key: "mar", label: "มี.ค." },
  { key: "apr", label: "เม.ย." },
  { key: "may", label: "พ.ค." },
  { key: "jun", label: "มิ.ย." },
  { key: "jul", label: "ก.ค." },
  { key: "aug", label: "ส.ค." },
  { key: "sep", label: "ก.ย." },
];

function toNumber(value) {
  return Number(value || 0);
}

export async function GET(request) {
  let conn;

  try {
    conn = await createDbConnection();
    const { searchParams } = new URL(request.url);
    const requestedYear = Number(searchParams.get("fiscalYear"));
    const requestedHospcode = searchParams.get("hospcode") || "";
    const requestedAffiliation = searchParams.get("affiliation") || "";

    const [yearRows] = await conn.query(
      "SELECT DISTINCT fiscal_year FROM `s_visit_monthly` ORDER BY fiscal_year DESC"
    );
    const fiscalYears = yearRows.map((row) => toNumber(row.fiscal_year)).filter(Boolean);
    const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);
    const hospitalInfo = await getHospInfoMap(conn);

    const [hospRows] = await conn.query(
      "SELECT DISTINCT hospcode FROM `s_visit_monthly` ORDER BY hospcode"
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

    if (!fiscalYear) {
      return Response.json({ fiscalYears, fiscalYear: null, affiliations, hospitals, months: MONTHS, rows: [], total: 0 });
    }

    const where = ["fiscal_year = ?"];
    const values = [fiscalYear];
    if (requestedHospcode) {
      where.push("hospcode = ?");
      values.push(requestedHospcode);
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode, ${MONTHS.map((month) => `\`${month.key}\``).join(", ")}, total
       FROM \`s_visit_monthly\`
       WHERE ${where.join(" AND ")}
       ORDER BY hospcode`,
      values
    );
    const rows = rawRows
      .map((row) => ({
        hospcode: row.hospcode,
        hospname: hospitalInfo[row.hospcode]?.hospname || "",
        affiliation: hospitalInfo[row.hospcode]?.affiliation || "",
        months: Object.fromEntries(MONTHS.map((month) => [month.key, toNumber(row[month.key])])),
        total: toNumber(row.total),
      }))
      .filter((row) => !requestedAffiliation || row.affiliation === requestedAffiliation);

    return Response.json({
      fiscalYears,
      fiscalYear,
      affiliations,
      hospitals,
      months: MONTHS,
      rows,
      total: rows.reduce((sum, row) => sum + row.total, 0),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
