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
    // นับรายหน่วยที่ขึ้นทะเบียน (hos_person_type_1_3 เก็บ hospcode คั่น ,) — คนหนึ่ง
    // ขึ้นทะเบียนหลายหน่วยได้ ผลรวมรายหน่วยจึงมากกว่าจำนวนคนจริง
    // แยกกลุ่มไม่ทับซ้อน: DM อย่างเดียว / HT อย่างเดียว / เป็นทั้งคู่
    const [sourceRows] = await conn.query(`
      SELECT
        u.hospcode,
        SUM(t.dm_code IS NOT NULL AND t.ht_code IS NULL) AS dm_only,
        SUM(t.ht_code IS NOT NULL AND t.dm_code IS NULL) AS ht_only,
        SUM(t.dm_code IS NOT NULL AND t.ht_code IS NOT NULL) AS dm_ht
      FROM \`s_person_type_count\` u
      JOIN \`t_person_dm_ht\` t ON FIND_IN_SET(u.hospcode, t.hos_person_type_1_3)
      GROUP BY u.hospcode
      ORDER BY u.hospcode
    `);
    const [[totals]] = await conn.query(`
      SELECT
        COUNT(*) AS patients,
        SUM(dm_code IS NOT NULL AND ht_code IS NULL) AS dm_only,
        SUM(ht_code IS NOT NULL AND dm_code IS NULL) AS ht_only,
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
      const dmOnly = toCount(row.dm_only);
      const htOnly = toCount(row.ht_only);
      const dmHt = toCount(row.dm_ht);

      return {
        hospcode: row.hospcode,
        hospname: hospNames[row.hospcode] || "",
        dmOnly,
        htOnly,
        dmHt,
        patients: dmOnly + htOnly + dmHt,
      };
    }).sort((left, right) => (
      right.patients - left.patients || left.hospcode.localeCompare(right.hospcode)
    ));

    const summary = {
      units: rows.length,
      dmOnly: toCount(totals?.dm_only),
      htOnly: toCount(totals?.ht_only),
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
