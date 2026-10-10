import { requireAccess } from "@/lib/access.mjs";
import { withDb } from "@/lib/db";
import { xlsxResponse } from "@/lib/report.mjs";

export const runtime = "nodejs";

// ส่งออกทะเบียน t_person_dm_ht ของหน่วยที่ขึ้นทะเบียน (hos_person_type_1_3)
// ตัด cid ออก — ชื่อคอลัมน์ตามชื่อในตาราง
const EXPORT_COLUMNS = [
  "hos_person_type_1_3",
  "pid_at_hos_type_1_3",
  "dm_code",
  "hos_dx_dm",
  "date_dx_dm",
  "ht_code",
  "hos_dx_ht",
  "date_dx_ht",
];

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  const hospcode = new URL(request.url).searchParams.get("hospcode") || "";
  if (!/^\w{1,10}$/.test(hospcode)) {
    return Response.json({ error: "hospcode ไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const [rows] = await withDb((conn) => conn.query(
      `SELECT ${EXPORT_COLUMNS.map((column) => `\`${column}\``).join(", ")}
       FROM \`t_person_dm_ht\`
       WHERE FIND_IN_SET(?, \`hos_person_type_1_3\`)
       ORDER BY \`cid\``,
      [hospcode]
    ));

    return xlsxResponse(
      EXPORT_COLUMNS.map((column) => [column, (row) => row[column]]),
      rows,
      { sheet: `dm_ht_${hospcode}`, filename: `dm_ht_${hospcode}.xlsx` }
    );
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีทะเบียน DM/HT กรุณารอให้ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  }
}
