import { createDbConnection } from "@/lib/db";
import { getHospInfoMap, getHospNameMap } from "@/lib/hos-list-query.mjs";

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
  let conn;

  try {
    conn = await createDbConnection();
    const { searchParams } = new URL(request.url);
    const requestedYear = Number(searchParams.get("fiscalYear"));
    const requestedHospcode = searchParams.get("hospcode") || "";
    const requestedAffiliation = searchParams.get("affiliation") || "";

    const [yearRows] = await conn.query(`
      SELECT DISTINCT fiscal_year
      FROM (
        SELECT fiscal_year FROM \`s_dm_screen\`
        UNION
        SELECT fiscal_year FROM \`s_ht_screen\`
      ) screening_years
      ORDER BY fiscal_year DESC
    `);
    const fiscalYears = yearRows.map((row) => toNumber(row.fiscal_year)).filter(Boolean);
    const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);
    const hospNames = await getHospNameMap(conn);
    const hospitalInfo = await getHospInfoMap(conn);

    const [hospRows] = await conn.query(`
      SELECT DISTINCT hospcode
      FROM (
        SELECT hospcode FROM \`s_dm_screen\`
        UNION
        SELECT hospcode FROM \`s_ht_screen\`
      ) screening_hospitals
      ORDER BY hospcode
    `);
    const allHospitals = hospRows.map((row) => ({
      hospcode: row.hospcode,
      hospname: hospitalInfo[row.hospcode]?.hospname || hospNames[row.hospcode] || "",
      affiliation: hospitalInfo[row.hospcode]?.affiliation || "",
    }));
    const affiliations = [...new Set(allHospitals.map((hospital) => hospital.affiliation).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "th"));
    const hospitals = requestedAffiliation
      ? allHospitals.filter((hospital) => hospital.affiliation === requestedAffiliation)
      : allHospitals;

    if (!fiscalYear) {
      return Response.json({ fiscalYears, fiscalYear: null, affiliations, hospitals, rows: [], trend: [], summary: { dm: 0, ht: 0, total: 0 } });
    }

    const where = ["fiscal_year = ?"];
    const values = [fiscalYear];
    if (requestedHospcode) {
      where.push("hospcode = ?");
      values.push(requestedHospcode);
    }

    const [rawRows] = await conn.query(
      `SELECT keys_by_month.hospcode, keys_by_month.month,
              COALESCE(dm.dm_screen, 0) AS dm_screen,
              COALESCE(ht.ht_screen, 0) AS ht_screen
       FROM (
         SELECT hospcode, fiscal_year, month
         FROM \`s_dm_screen\`
         WHERE ${where.join(" AND ")}
         UNION
         SELECT hospcode, fiscal_year, month
         FROM \`s_ht_screen\`
         WHERE ${where.join(" AND ")}
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
      const rowAffiliation = hospitalInfo[row.hospcode]?.affiliation || "";
      if (requestedAffiliation && rowAffiliation !== requestedAffiliation) continue;
      const dm = toNumber(row.dm_screen);
      const ht = toNumber(row.ht_screen);
      const total = dm + ht;
      const current = byHospital.get(row.hospcode) || {
        hospcode: row.hospcode,
        hospname: hospitalInfo[row.hospcode]?.hospname || hospNames[row.hospcode] || "",
        affiliation: rowAffiliation,
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
      .filter((row) => !requestedAffiliation || row.affiliation === requestedAffiliation)
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
