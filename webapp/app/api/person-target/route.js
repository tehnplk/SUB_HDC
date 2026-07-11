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
    const [sourceRows] = await conn.query(`
      SELECT hospcode, type_1, type_2, type_3, type_4, type_5
      FROM \`s_person_type_count\`
      ORDER BY hospcode
    `);
    const hospNames = await getHospNameMap(conn);

    let transformedAt = null;
    try {
      const [[latestTransform]] = await conn.query(`
        SELECT finish_at
        FROM \`log_transform\`
        WHERE transform_sql_task = 's_person_type_count.sql'
          AND finish_at IS NOT NULL
        ORDER BY finish_at DESC
        LIMIT 1
      `);
      transformedAt = latestTransform?.finish_at || null;
    } catch {
      // Older sites may not have transform logging yet; the summary remains usable.
    }

    const rows = sourceRows.map((row) => {
      const type1 = toCount(row.type_1);
      const type2 = toCount(row.type_2);
      const type3 = toCount(row.type_3);
      const type4 = toCount(row.type_4);
      const type5 = toCount(row.type_5);

      return {
        hospcode: row.hospcode,
        hospname: hospNames[row.hospcode] || "",
        type1,
        type2,
        type3,
        type4,
        type5,
        targetPopulation: type1 + type3,
        totalPopulation: type1 + type2 + type3 + type4 + type5,
      };
    }).sort((left, right) => (
      right.targetPopulation - left.targetPopulation || left.hospcode.localeCompare(right.hospcode)
    ));

    const summary = rows.reduce((totals, row) => ({
      units: totals.units + 1,
      type1: totals.type1 + row.type1,
      type2: totals.type2 + row.type2,
      type3: totals.type3 + row.type3,
      type4: totals.type4 + row.type4,
      type5: totals.type5 + row.type5,
      targetPopulation: totals.targetPopulation + row.targetPopulation,
      totalPopulation: totals.totalPopulation + row.totalPopulation,
    }), {
      units: 0,
      type1: 0,
      type2: 0,
      type3: 0,
      type4: 0,
      type5: 0,
      targetPopulation: 0,
      totalPopulation: 0,
    });

    return Response.json({ rows, summary, transformedAt });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีข้อมูลสรุปประชากร กรุณารอให้ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
