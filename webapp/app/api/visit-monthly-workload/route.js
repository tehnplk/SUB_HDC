import { createDbConnection } from "@/lib/db";
import { getHospInfoMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

const MONTHS = [
  { value: 10, label: "ต.ค." },
  { value: 11, label: "พ.ย." },
  { value: 12, label: "ธ.ค." },
  { value: 1, label: "ม.ค." },
  { value: 2, label: "ก.พ." },
  { value: 3, label: "มี.ค." },
  { value: 4, label: "เม.ย." },
  { value: 5, label: "พ.ค." },
  { value: 6, label: "มิ.ย." },
  { value: 7, label: "ก.ค." },
  { value: 8, label: "ส.ค." },
  { value: 9, label: "ก.ย." },
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
      "SELECT DISTINCT fiscal_year FROM `s_visit` ORDER BY fiscal_year DESC"
    );
    const fiscalYears = yearRows.map((row) => toNumber(row.fiscal_year)).filter(Boolean);
    const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);
    const hospitalInfo = await getHospInfoMap(conn);

    const [hospRows] = await conn.query(
      "SELECT DISTINCT hospcode FROM `s_visit` ORDER BY hospcode"
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
      return Response.json({ fiscalYears, fiscalYear: null, affiliations, hospitals, months: MONTHS, rows: [] });
    }

    const where = ["fiscal_year = ?"];
    const values = [fiscalYear];
    if (requestedHospcode) {
      where.push("hospcode = ?");
      values.push(requestedHospcode);
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode, month, visit_person, visit_count
       FROM \`s_visit\`
       WHERE ${where.join(" AND ")}
       ORDER BY hospcode, month`,
      values
    );
    const byHospital = new Map();
    for (const rawRow of rawRows) {
      const info = hospitalInfo[rawRow.hospcode] || {};
      if (requestedAffiliation && info.affiliation !== requestedAffiliation) continue;
      const row = byHospital.get(rawRow.hospcode) || {
        hospcode: rawRow.hospcode,
        hospname: info.hospname || "",
        affiliation: info.affiliation || "",
        months: Object.fromEntries(MONTHS.map((month) => [month.value, { visitPerson: 0, visitCount: 0 }])),
      };
      const month = row.months[toNumber(rawRow.month)];
      if (month) {
        month.visitPerson = toNumber(rawRow.visit_person);
        month.visitCount = toNumber(rawRow.visit_count);
      }
      byHospital.set(rawRow.hospcode, row);
    }
    const rows = [...byHospital.values()].sort((left, right) => left.hospcode.localeCompare(right.hospcode));

    return Response.json({
      fiscalYears,
      fiscalYear,
      affiliations,
      hospitals,
      months: MONTHS,
      rows,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
