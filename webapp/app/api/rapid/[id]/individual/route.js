import * as XLSX from "xlsx";
import { requireApiJwt } from "@/lib/api-auth.mjs";
import { RAPID_REPORTS } from "@/app/rapid/_lib/rapid-reports.mjs";

export const runtime = "nodejs";

// ดาวน์โหลดรายชื่อ "ส่วนขาด" รายคนของหน่วยบริการ
// TODO: ยังเป็น dummy — รอต่อแหล่งข้อมูลรายคนจริง (transform/raw ตาม topic)
// เป็นข้อมูลรายคน จึงต้อง login ก่อน (เปิดลิงก์ตรงจาก browser → redirect หน้าแจ้งเตือน)
export async function GET(request, { params }) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) {
    const msg = encodeURIComponent("ต้องเข้าสู่ระบบก่อนจึงจะดาวน์โหลดรายชื่อรายคนได้");
    return new Response(null, { status: 302, headers: { Location: `/error/msg?msg=${msg}` } });
  }

  const { id } = await params;
  const report = RAPID_REPORTS[id];
  if (!report) return Response.json({ error: "ไม่พบตัวชี้วัดนี้" }, { status: 404 });

  const hospcode = new URL(request.url).searchParams.get("hospcode") || "";
  if (!/^\w{1,10}$/.test(hospcode)) {
    return Response.json({ error: "hospcode ไม่ถูกต้อง" }, { status: 400 });
  }

  // --- DUMMY DATA (placeholder) ---
  const aoa = [
    ["ลำดับ", "หน่วยบริการ", "ตัวชี้วัด", "หมายเหตุ"],
    [1, hospcode, report.title, "ตัวอย่างข้อมูล (dummy) — ยังไม่เชื่อมข้อมูลรายคนจริง"],
    [2, hospcode, report.title, "ตัวอย่างข้อมูล (dummy) — ยังไม่เชื่อมข้อมูลรายคนจริง"],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(workbook, worksheet, `deficit_${hospcode}`.slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  const filename = `rapid_${id}_deficit_${hospcode}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
