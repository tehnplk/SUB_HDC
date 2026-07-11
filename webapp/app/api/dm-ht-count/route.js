import { createDbConnection } from "@/lib/db";
import { getHospNameMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

function toCount(value) {
  return Number(value || 0);
}

export async function GET() {
  let conn;

  try {
    conn = await createDbConnection();
    // นับรายหน่วยที่ขึ้นทะเบียน (type_1_3_at เก็บ hospcode คั่น ,) — คนหนึ่ง
    // ขึ้นทะเบียนหลายหน่วยได้ ผลรวมรายหน่วยจึงมากกว่าจำนวนคนจริง
    const [sourceRows] = await conn.query(`
      SELECT
        u.hospcode,
        SUM(t.dm_code IS NOT NULL) AS dm,
        SUM(t.ht_code IS NOT NULL) AS ht,
        SUM(t.dm_code IS NOT NULL AND t.ht_code IS NOT NULL) AS dm_ht
      FROM \`s_person_type_count\` u
      JOIN \`t_person_dm_ht\` t ON FIND_IN_SET(u.hospcode, t.type_1_3_at)
      GROUP BY u.hospcode
      ORDER BY u.hospcode
    `);
    const [[totals]] = await conn.query(`
      SELECT
        COUNT(*) AS patients,
        SUM(dm_code IS NOT NULL) AS dm,
        SUM(ht_code IS NOT NULL) AS ht,
        SUM(dm_code IS NOT NULL AND ht_code IS NOT NULL) AS dm_ht
      FROM \`t_person_dm_ht\`
    `);
    const hospNames = await getHospNameMap(conn);

    let transformedAt = null;
    try {
      const [[latestTransform]] = await conn.query(`
        SELECT finish_at
        FROM \`log_transform\`
        WHERE transform_sql_task = 't_person_dm_ht.sql'
          AND finish_at IS NOT NULL
        ORDER BY finish_at DESC
        LIMIT 1
      `);
      transformedAt = latestTransform?.finish_at || null;
    } catch {
      // Older sites may not have transform logging yet; the summary remains usable.
    }

    const rows = sourceRows.map((row) => {
      const dm = toCount(row.dm);
      const ht = toCount(row.ht);
      const dmHt = toCount(row.dm_ht);

      return {
        hospcode: row.hospcode,
        hospname: hospNames[row.hospcode] || "",
        dm,
        ht,
        dmHt,
        patients: dm + ht - dmHt,
      };
    }).sort((left, right) => (
      right.patients - left.patients || left.hospcode.localeCompare(right.hospcode)
    ));

    const summary = {
      units: rows.length,
      dm: toCount(totals?.dm),
      ht: toCount(totals?.ht),
      dmHt: toCount(totals?.dm_ht),
      patients: toCount(totals?.patients),
    };

    return Response.json({ rows, summary, transformedAt });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีทะเบียน DM/HT กรุณารอให้ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
