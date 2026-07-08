// เช็คว่ามีการนำเข้าข้อมูลกำลังทำงานอยู่ไหม (pending/processing ใน log_import_file)
// ใช้ block หน้าที่ query ตารางใหญ่ (hos-list, report, ai chat) ระหว่าง import
// เพราะ LOAD DATA เขียนตารางอยู่ การ query หนักจะแย่ง disk I/O ทั้งสองฝั่งช้า
export const IMPORTING_MESSAGE =
  "กำลังมีการนำเข้าข้อมูล ไม่สามารถแสดงผลได้ในขณะนี้ กรุณากลับมาอีกครั้งเมื่อการนำเข้าสิ้นสุด";

export async function isImporting(conn) {
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS n FROM log_import_file WHERE status IN ('pending','processing')"
  );
  return Number(row.n) > 0;
}
