import { withDb } from "@/lib/db";
import { resolveReportScope } from "@/lib/report.mjs";

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
  return withDb(async (conn) => {
    const scope = await resolveReportScope(conn, new URL(request.url).searchParams, { tables: ["s_visit"] });
    const { fiscalYears, fiscalYear, affiliations, hospitals } = scope;

    if (!fiscalYear) {
      return Response.json({ fiscalYears, fiscalYear: null, affiliations, hospitals, months: MONTHS, rows: [] });
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode, month, visit_person, visit_count
       FROM \`s_visit\`
       WHERE ${scope.where}
       ORDER BY hospcode, month`,
      scope.values
    );
    const byHospital = new Map();
    for (const rawRow of rawRows) {
      if (!scope.inAffiliation(rawRow.hospcode)) continue;
      const row = byHospital.get(rawRow.hospcode) || {
        hospcode: rawRow.hospcode,
        ...scope.hospitalOf(rawRow.hospcode),
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
  }).catch((error) => Response.json({ error: error.message }, { status: 500 }));
}
