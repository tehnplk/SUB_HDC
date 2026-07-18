import * as XLSX from "xlsx";
import { requireApiJwt } from "@/lib/api-auth.mjs";
import { requireExcelExportAccess } from "@/lib/auth-guard.mjs";
import { createDbConnection } from "@/lib/db";
import { getHospNameMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

// ส่งออกประชากร TYPE 1/3 ที่เลขบัตรซ้ำข้ามหน่วยบริการ จาก t_person_type_1_3
// 1 แถว = 1 ทะเบียนต่อหน่วยบริการ (แตก CSV ที่เรียงตำแหน่งตรงกัน) — ไม่ส่งออก cid
const CSV_COLUMNS = [
  "name", "bdate", "sex", "hos", "pid", "hn", "type",
  "age_y_fiscal", "age_m_fiscal", "age_d_fiscal",
  "age_y_current", "age_m_current", "age_d_current",
  "d_update",
];
const HEADER = ["ชื่อ", "หน่วยบริการ", "ชื่อหน่วยบริการ", "PID", "HN", "TYPE", "เพศ", "วันเกิด", "อายุ ณ วันเริ่มปีงบประมาณ", "อายุปัจจุบัน", "ปรับปรุงล่าสุด"];

function splitCsv(value) {
  return value === null || value === undefined ? [] : String(value).split(",");
}

function formatBirth(value) {
  if (!value || !/^\d{8}$/.test(value)) return value || "";
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${Number(value.slice(0, 4)) + 543}`;
}

function formatSex(value) {
  if (value === "1") return "ชาย";
  if (value === "2") return "หญิง";
  return value || "";
}

function formatDUpdate(value) {
  if (!value || !/^\d{8}/.test(value)) return value || "";
  const date = `${value.slice(6, 8)}/${value.slice(4, 6)}/${Number(value.slice(0, 4)) + 543}`;
  return value.length >= 12 ? `${date} ${value.slice(8, 10)}:${value.slice(10, 12)}` : date;
}

function formatAge(years, months, days) {
  const values = [years, months, days];
  if (values.every((value) => value === null || value === undefined || value === "")) return "";
  return `${years || 0} ปี ${months || 0} เดือน ${days || 0} วัน`;
}

export async function GET(request) {
  // ทะเบียนรายคน (มี pid/hn) — ต้อง login ก่อนจึงส่งออกได้
  // ลิงก์นี้เปิดจาก browser ตรง ๆ จึง redirect ไปหน้าแจ้งเตือนแทนตอบ 401 JSON
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) {
    const msg = encodeURIComponent("ต้องเข้าสู่ระบบก่อนจึงจะส่งออกรายชื่อแบบปกปิดได้");
    return new Response(null, {
      status: 302,
      headers: { Location: `/error/msg?msg=${msg}` },
    });
  }
  const exportDenied = await requireExcelExportAccess();
  if (exportDenied) return exportDenied;

  const hospcode = new URL(request.url).searchParams.get("hospcode") || "";
  if (!hospcode) {
    return Response.json({ error: "กรุณาเลือกหน่วยบริการก่อนส่งออก" }, { status: 400 });
  }
  if (!/^\w{1,10}$/.test(hospcode)) {
    return Response.json({ error: "hospcode ไม่ถูกต้อง" }, { status: 400 });
  }

  let conn;
  try {
    conn = await createDbConnection();

    const [rawRows] = await conn.query(
      `SELECT ${CSV_COLUMNS.join(", ")}
       FROM \`t_person_type_1_3\`
       WHERE hos LIKE '%,%' AND FIND_IN_SET(?, hos)
       ORDER BY cid`,
      [hospcode]
    );

    const hospNames = await getHospNameMap(conn);

    // แตก CSV เป็นราย row ต่อหน่วยบริการ ตามตำแหน่งที่ตรงกัน
    const rows = [];
    for (const row of rawRows) {
      const columns = Object.fromEntries(CSV_COLUMNS.map((key) => [key, splitCsv(row[key])]));
      const size = columns.hos.length;
      for (let i = 0; i < size; i += 1) {
        const hos = columns.hos[i] || "";
        rows.push({
          "ชื่อ": columns.name[i] || "",
          "หน่วยบริการ": hos,
          "ชื่อหน่วยบริการ": hospNames[hos] || "",
          "PID": columns.pid[i] || "",
          "HN": columns.hn[i] || "",
          "TYPE": columns.type[i] || "",
          "เพศ": formatSex(columns.sex[i]),
          "วันเกิด": formatBirth(columns.bdate[i]),
          "อายุ ณ วันเริ่มปีงบประมาณ": formatAge(columns.age_y_fiscal[i], columns.age_m_fiscal[i], columns.age_d_fiscal[i]),
          "อายุปัจจุบัน": formatAge(columns.age_y_current[i], columns.age_m_current[i], columns.age_d_current[i]),
          "ปรับปรุงล่าสุด": formatDUpdate(columns.d_update[i]),
        });
      }
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = rows.length
      ? XLSX.utils.json_to_sheet(rows, { header: HEADER })
      : XLSX.utils.aoa_to_sheet([HEADER]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "person_dup");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const suffix = hospcode || "all";
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="person_dup_${suffix}.xlsx"`,
      },
    });
  } catch (error) {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีตารางสรุป t_person_type_1_3 กรุณารอ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
