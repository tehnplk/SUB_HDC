import { withDb } from "@/lib/db";
import { resolveReportScope } from "@/lib/report.mjs";

export const runtime = "nodejs";

const FISCAL_MONTHS = [
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
    const scope = await resolveReportScope(conn, new URL(request.url).searchParams, {
      tables: ["s_dm_screen", "s_ht_screen"],
    });
    const { fiscalYears, fiscalYear, affiliations, hospitals, where, values } = scope;

    if (!fiscalYear) {
      return Response.json({ fiscalYears, fiscalYear: null, affiliations, hospitals, rows: [], trend: [], summary: { dm: 0, ht: 0, total: 0 } });
    }

    const [rawRows] = await conn.query(
      `SELECT keys_by_month.hospcode, keys_by_month.month,
              COALESCE(dm.dm_screen, 0) AS dm_screen,
              COALESCE(ht.ht_screen, 0) AS ht_screen
       FROM (
         SELECT hospcode, fiscal_year, month
         FROM \`s_dm_screen\`
         WHERE ${where}
         UNION
         SELECT hospcode, fiscal_year, month
         FROM \`s_ht_screen\`
         WHERE ${where}
       ) keys_by_month
       LEFT JOIN \`s_dm_screen\` dm
         ON dm.hospcode = keys_by_month.hospcode
         AND dm.fiscal_year = keys_by_month.fiscal_year
         AND dm.month = keys_by_month.month
       LEFT JOIN \`s_ht_screen\` ht
         ON ht.hospcode = keys_by_month.hospcode
         AND ht.fiscal_year = keys_by_month.fiscal_year
         AND ht.month = keys_by_month.month
       ORDER BY keys_by_month.hospcode, keys_by_month.month`,
      [...values, ...values]
    );

    const byHospital = new Map();
    const byMonth = new Map(FISCAL_MONTHS.map((month) => [month.value, { ...month, dm: 0, ht: 0, total: 0 }]));

    for (const row of rawRows) {
      if (!scope.inAffiliation(row.hospcode)) continue;
      const dm = toNumber(row.dm_screen);
      const ht = toNumber(row.ht_screen);
      const total = dm + ht;
      const current = byHospital.get(row.hospcode) || {
        hospcode: row.hospcode,
        ...scope.hospitalOf(row.hospcode),
        dm: 0,
        ht: 0,
        total: 0,
        months: Object.fromEntries(FISCAL_MONTHS.map((item) => [item.value, { dm: 0, ht: 0 }])),
      };
      current.dm += dm;
      current.ht += ht;
      current.total += total;
      const monthValue = current.months[toNumber(row.month)];
      if (monthValue) {
        monthValue.dm += dm;
        monthValue.ht += ht;
      }
      byHospital.set(row.hospcode, current);

      const month = byMonth.get(toNumber(row.month));
      if (month) {
        month.dm += dm;
        month.ht += ht;
        month.total += total;
      }
    }

    const rows = [...byHospital.values()]
      .sort((left, right) => left.hospcode.localeCompare(right.hospcode));
    const summary = rows.reduce(
      (total, row) => ({ dm: total.dm + row.dm, ht: total.ht + row.ht, total: total.total + row.total }),
      { dm: 0, ht: 0, total: 0 }
    );

    return Response.json({
      fiscalYears,
      fiscalYear,
      affiliations,
      hospitals,
      months: FISCAL_MONTHS,
      rows,
      trend: FISCAL_MONTHS.map((month) => byMonth.get(month.value)),
      summary,
    });
  }).catch((error) => Response.json({ error: error.message }, { status: 500 }));
}
