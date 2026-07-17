import { requireApiJwt } from "@/lib/api-auth.mjs";
import { createDbConnection } from "@/lib/db";
import { getHospNameMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

// ประชากร TYPE 1/3 ที่เลขบัตร 13 หลัก (cid) เดียวกันถูกขึ้นทะเบียนซ้ำมากกว่า 1 หน่วยบริการ
// อ่านจากตารางสรุป t_person_type_1_3 (1 cid = 1 แถว, ค่าเป็น CSV เรียงตำแหน่งตรงกันตาม hos)
// แถวที่ hos มีมากกว่า 1 ค่า (มี ',') คือคนที่ซ้ำข้ามหน่วยบริการ
const CSV_COLUMNS = [
  "name", "bdate", "sex", "hos", "pid", "hn", "type",
  "age_y_fiscal", "age_m_fiscal", "age_d_fiscal",
  "age_y_current", "age_m_current", "age_d_current",
  "d_update",
];

function splitCsv(value) {
  return value === null || value === undefined ? [] : String(value).split(",");
}

export async function GET(request) {
  // ทะเบียนรายคน (มี pid/hn) — เรียกผ่าน fetch ในหน้า ตอบ 401 JSON เมื่อไม่ login
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) return unauthorized;

  let conn;

  try {
    conn = await createDbConnection();

    const [rawRows] = await conn.query(`
      SELECT cid, name, bdate, sex, hos, pid, hn, type,
             age_y_fiscal, age_m_fiscal, age_d_fiscal,
             age_y_current, age_m_current, age_d_current,
             d_update
      FROM \`t_person_type_1_3\`
      WHERE hos LIKE '%,%'
      ORDER BY cid
    `);

    const hospNames = await getHospNameMap(conn);

    let transformedAt = null;
    try {
      const [[latestTransform]] = await conn.query(`
        SELECT finish_at
        FROM \`log_transform\`
        WHERE transform_sql_task = 't_person_type_1_3.sql'
          AND finish_at IS NOT NULL
        ORDER BY finish_at DESC
        LIMIT 1
      `);
      transformedAt = latestTransform?.finish_at || null;
    } catch {
      // ไซต์เก่ายังไม่มี log_transform — หน้ายังใช้งานได้
    }

    const hospcodeSet = new Set();

    // แตก CSV ที่เรียงตำแหน่งตรงกันเป็นรายหน่วยบริการ 1 entry ต่อ 1 ทะเบียน
    // ไม่ส่ง cid ออกไปฝั่ง client — ใช้ groupId แทนเพื่อจัดกลุ่ม/แสดงผล
    const persons = rawRows.map((row, index) => {
      const columns = Object.fromEntries(CSV_COLUMNS.map((key) => [key, splitCsv(row[key])]));
      const size = columns.hos.length;
      const entries = [];
      for (let i = 0; i < size; i += 1) {
        const hos = columns.hos[i] || "";
        if (hos) hospcodeSet.add(hos);
        entries.push({
          hos,
          hospname: hospNames[hos] || "",
          name: columns.name[i] || "",
          birth: columns.bdate[i] || "",
          sex: columns.sex[i] || "",
          pid: columns.pid[i] || "",
          hn: columns.hn[i] || "",
          type: columns.type[i] || "",
          age_y_fiscal: columns.age_y_fiscal[i] || "",
          age_m_fiscal: columns.age_m_fiscal[i] || "",
          age_d_fiscal: columns.age_d_fiscal[i] || "",
          age_y_current: columns.age_y_current[i] || "",
          age_m_current: columns.age_m_current[i] || "",
          age_d_current: columns.age_d_current[i] || "",
          d_update: columns.d_update[i] || "",
        });
      }
      return { groupId: index + 1, entries };
    });

    const hospcodes = [...hospcodeSet]
      .sort((left, right) => left.localeCompare(right))
      .map((code) => ({ code, name: hospNames[code] || "" }));

    return Response.json({ count: persons.length, persons, hospcodes, transformedAt });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีตารางสรุป t_person_type_1_3 กรุณารอ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
