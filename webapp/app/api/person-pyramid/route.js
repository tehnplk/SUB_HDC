import { withDb } from "@/lib/db";
import { getHospNameMap } from "@/lib/hos-list-query.mjs";
import { latestTransformAt } from "@/lib/report.mjs";

export const runtime = "nodejs";

function toCount(value) {
  return Number(value || 0);
}

function ageStart(ageRange) {
  const match = String(ageRange || "").match(/^\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export async function GET() {
  return withDb(async (conn) => {
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

    const transformedAt = await latestTransformAt(conn, "s_person_pyramid.sql");

    return Response.json({ rows, transformedAt });
  }).catch((error) => {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีข้อมูลปิรามิดประชากร กรุณารอให้ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  });
}
