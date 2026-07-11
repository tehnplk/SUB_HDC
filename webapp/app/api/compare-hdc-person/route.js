import { createDbConnection } from "@/lib/db";
import { getHospNameMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

const TYPE_KEYS = ["type1", "type2", "type3", "type4", "type5"];

function toCount(value) {
  return Number(value || 0);
}

export async function GET() {
  let conn;

  try {
    conn = await createDbConnection();

    // HDC opendata ดึงโดย sync job hdc_api_s_persontype — ใช้ปีล่าสุดที่มี
    const [[hdcMeta]] = await conn.query(`
      SELECT MAX(b_year) AS b_year FROM \`hdc_api_s_persontype\`
    `);
    const hdcYear = hdcMeta?.b_year || null;

    const [hdcRows] = hdcYear
      ? await conn.query(
          `
            SELECT hospcode, type1, type2, type3, type4, type5, date_com, d_update
            FROM \`hdc_api_s_persontype\`
            WHERE b_year = ?
          `,
          [hdcYear]
        )
      : [[]];

    const [subRows] = await conn.query(`
      SELECT hospcode, type_1, type_2, type_3, type_4, type_5
      FROM \`s_person_type_count\`
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
      // Older sites may not have transform logging yet; the comparison remains usable.
    }

    let hdcFetchedAt = null;
    const hdcByHospcode = new Map();

    for (const row of hdcRows) {
      hdcByHospcode.set(row.hospcode, TYPE_KEYS.map((key) => toCount(row[key])));
      if (!hdcFetchedAt || row.d_update > hdcFetchedAt) hdcFetchedAt = row.d_update;
    }

    // แสดงเฉพาะหน่วยที่มีใน s_person_type_count (มีข้อมูลนำเข้าฝั่ง SUB-HDC แล้ว)
    const rows = subRows
      .map((row) => {
        const hdc = hdcByHospcode.get(row.hospcode) || TYPE_KEYS.map(() => 0);
        const sub = [row.type_1, row.type_2, row.type_3, row.type_4, row.type_5].map(toCount);
        return {
          hospcode: row.hospcode,
          hospname: hospNames[row.hospcode] || "",
          types: TYPE_KEYS.map((key, index) => ({
            hdc: hdc[index],
            sub: sub[index],
            diff: sub[index] - hdc[index],
          })),
        };
      })
      .sort((left, right) => left.hospcode.localeCompare(right.hospcode));

    const summary = {
      units: rows.length,
      hdcType1: rows.reduce((total, row) => total + row.types[0].hdc, 0),
      subType1: rows.reduce((total, row) => total + row.types[0].sub, 0),
      // หน่วยที่ SUB-HDC น้อยกว่า HDC ใน type1 หรือ type3 (จุดที่ต้องตามข้อมูล)
      shortUnits: rows.filter((row) => row.types[0].diff < 0 || row.types[2].diff < 0).length,
    };

    return Response.json({ rows, summary, hdcYear, hdcFetchedAt, transformedAt });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีข้อมูลเปรียบเทียบ กรุณารอ sync job hdc_api_s_persontype และ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
