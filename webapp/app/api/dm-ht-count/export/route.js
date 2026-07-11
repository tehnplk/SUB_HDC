import * as XLSX from "xlsx";
import { requireApiJwt } from "@/lib/api-auth.mjs";
import { createDbConnection } from "@/lib/db";

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
  // ทะเบียนรายคน (มี pid) — ต้อง login ก่อนจึงส่งออกได้
  // ลิงก์นี้เปิดจาก browser ตรง ๆ จึง redirect ไปหน้าแจ้งเตือนแทนตอบ 401 JSON
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) {
    const errorUrl = new URL("/error/msg", request.url);
    errorUrl.searchParams.set("msg", "ต้องเข้าสู่ระบบก่อนจึงจะส่งออกรายชื่อแบบปกปิดได้");
    return Response.redirect(errorUrl, 302);
  }

  const hospcode = new URL(request.url).searchParams.get("hospcode") || "";
  if (!/^\w{1,10}$/.test(hospcode)) {
    return Response.json({ error: "hospcode ไม่ถูกต้อง" }, { status: 400 });
  }

  let conn;
  try {
    conn = await createDbConnection();
    const [rows] = await conn.query(
      `SELECT ${EXPORT_COLUMNS.map((column) => `\`${column}\``).join(", ")}
       FROM \`t_person_dm_ht\`
       WHERE FIND_IN_SET(?, \`hos_person_type_1_3\`)
       ORDER BY \`cid\``,
      [hospcode]
    );

    const workbook = XLSX.utils.book_new();
    const worksheet = rows.length
      ? XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS })
      : XLSX.utils.aoa_to_sheet([EXPORT_COLUMNS]);
    XLSX.utils.book_append_sheet(workbook, worksheet, `dm_ht_${hospcode}`.slice(0, 31));
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dm_ht_${hospcode}.xlsx"`,
      },
    });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีทะเบียน DM/HT กรุณารอให้ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
