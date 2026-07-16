import * as XLSX from "xlsx";
import { requireApiJwt } from "@/lib/api-auth.mjs";
import { requireExcelExportAccess } from "@/lib/auth-guard.mjs";
import { createDbConnection } from "@/lib/db";
import { getHospInfoMap } from "@/lib/hos-list-query.mjs";

export const runtime = "nodejs";

function formatDate(value) {
  if (!value || !/^\d{8}$/.test(value)) return value || "";
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${Number(value.slice(0, 4)) + 543}`;
}

export async function GET(request) {
  const unauthorized = await requireApiJwt(request);
  if (unauthorized) {
    const msg = encodeURIComponent("ต้องเข้าสู่ระบบก่อนจึงจะส่งออก Excel ได้");
    return new Response(null, { status: 302, headers: { Location: `/error/msg?msg=${msg}` } });
  }
  const exportDenied = await requireExcelExportAccess();
  if (exportDenied) return exportDenied;

  let conn;
  try {
    conn = await createDbConnection();
    const { searchParams } = new URL(request.url);
    const requestedYear = Number(searchParams.get("fiscalYear"));
    const requestedHospcode = searchParams.get("hospcode") || "";
    const requestedAffiliation = searchParams.get("affiliation") || "";
    const hospitalInfo = await getHospInfoMap(conn, { affiliationSource: "depShort" });

    const [yearRows] = await conn.query(
      "SELECT DISTINCT fiscal_year FROM `t_service_intype_error` ORDER BY fiscal_year DESC"
    );
    const fiscalYears = yearRows.map((row) => Number(row.fiscal_year)).filter(Boolean);
    const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);

    const [hospRows] = await conn.query(
      "SELECT DISTINCT hospcode FROM `t_service_intype_error` WHERE fiscal_year = ? ORDER BY hospcode",
      [fiscalYear]
    );
    const availableHospcodes = new Set(hospRows.map((row) => row.hospcode));
    if (!requestedHospcode) {
      return Response.json({ error: "ต้องระบุรหัสหน่วยบริการ" }, { status: 400 });
    }
    if (requestedHospcode && !availableHospcodes.has(requestedHospcode)) {
      return Response.json({ error: "ไม่พบหน่วยบริการ" }, { status: 400 });
    }
    if (requestedHospcode && requestedAffiliation && hospitalInfo[requestedHospcode]?.affiliation !== requestedAffiliation) {
      return Response.json({ error: "หน่วยบริการไม่อยู่ในสังกัดที่เลือก" }, { status: 400 });
    }

    const where = ["fiscal_year = ?"];
    const values = [fiscalYear];
    if (requestedHospcode) {
      where.push("hospcode = ?");
      values.push(requestedHospcode);
    }
    const [rawRows] = await conn.query(
      `SELECT hospcode, fiscal_year, pid, seq, date_serve, instype
       FROM \`t_service_intype_error\`
       WHERE ${where.join(" AND ")}
       ORDER BY hospcode, date_serve, pid, seq`,
      values
    );
    const rows = rawRows
      .filter((row) => !requestedAffiliation || hospitalInfo[row.hospcode]?.affiliation === requestedAffiliation)
      .map((row) => ({
        "หน่วยบริการ": row.hospcode,
        "ชื่อหน่วยบริการ": hospitalInfo[row.hospcode]?.hospname || "",
        "สังกัด": hospitalInfo[row.hospcode]?.affiliation || "",
        "ปีงบประมาณ": row.fiscal_year,
        PID: row.pid || "",
        SEQ: row.seq || "",
        "วันที่รับบริการ": formatDate(row.date_serve),
        "รหัสสิทธิ": row.instype || "",
      }));
    const headers = ["หน่วยบริการ", "ชื่อหน่วยบริการ", "สังกัด", "ปีงบประมาณ", "PID", "SEQ", "วันที่รับบริการ", "รหัสสิทธิ"];
    const workbook = XLSX.utils.book_new();
    const worksheet = rows.length
      ? XLSX.utils.json_to_sheet(rows, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);
    worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length + 2, 14) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "service_instype_error");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const suffix = [fiscalYear, requestedHospcode].join("_");
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="service_instype_error_${suffix}.xlsx"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
