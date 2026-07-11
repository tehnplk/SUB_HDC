import { createDbConnection } from "@/lib/db";
import { getHospNameMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

function toCount(value) {
  return Number(value || 0);
}

function ageStart(ageRange) {
  const match = String(ageRange || "").match(/^\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export async function GET() {
  let conn;

  try {
    conn = await createDbConnection();
    const [sourceRows] = await conn.query(`
      SELECT hospcode, age_range, male, female
      FROM \`s_person_pyramid\`
    `);
    const hospNames = await getHospNameMap(conn);

    const rows = sourceRows.map((row) => ({
      hospcode: row.hospcode,
      hospname: hospNames[row.hospcode] || "",
      ageRange: row.age_range,
      male: toCount(row.male),
      female: toCount(row.female),
    })).sort((left, right) => (
      left.hospcode.localeCompare(right.hospcode) || ageStart(left.ageRange) - ageStart(right.ageRange)
    ));

    let transformedAt = null;
    try {
      const [[latestTransform]] = await conn.query(`
        SELECT finish_at
        FROM \`log_transform\`
        WHERE transform_sql_task = 's_person_pyramid.sql'
          AND finish_at IS NOT NULL
        ORDER BY finish_at DESC
        LIMIT 1
      `);
      transformedAt = latestTransform?.finish_at || null;
    } catch {
      // The transform table is still useful on hosts that do not log runs yet.
    }

    return Response.json({ rows, transformedAt });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีข้อมูลปิรามิดประชากร กรุณารอให้ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
