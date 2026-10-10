import { requireAccess } from "@/lib/access.mjs";
import { withDb } from "@/lib/db";
import { latestTransformAt, resolveReportScope } from "@/lib/report.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  return withDb(async (conn) => {
    const { searchParams } = new URL(request.url);
    const scope = await resolveReportScope(conn, searchParams, {
      tables: ["t_service_intype_error"],
      hospitalsPerYear: true,
      affiliationSource: "depShort",
    });
    if (scope.badRequest) return scope.badRequest;
    const transformedAt = await latestTransformAt(conn, "t_service_intype_error.sql");

    // รายการรายบุคคลของหน่วยบริการเดียว — export/route.js ใช้ชุดเดียวกันนี้
    if (searchParams.get("details") === "1") {
      if (!scope.hospcode) {
        return Response.json({ error: "ต้องระบุรหัสหน่วยบริการ" }, { status: 400 });
      }
      const [rawRows] = await conn.query(
        `SELECT hospcode, fiscal_year, pid, seq, date_serve, instype
         FROM \`t_service_intype_error\`
         WHERE ${scope.where}
         ORDER BY date_serve DESC, pid, seq`,
        scope.values
      );
      const rows = rawRows.map((row) => ({ ...row, ...scope.hospitalOf(row.hospcode) }));
      return Response.json({ rows, count: rows.length, transformedAt, fiscalYear: scope.fiscalYear });
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode, COUNT(*) AS count
       FROM \`t_service_intype_error\`
       WHERE ${scope.where}
       GROUP BY hospcode
       ORDER BY count DESC, hospcode`,
      scope.values
    );
    const rows = rawRows
      .filter((row) => scope.inAffiliation(row.hospcode))
      .map((row) => ({
        hospcode: row.hospcode,
        ...scope.hospitalOf(row.hospcode),
        count: Number(row.count),
      }));

    return Response.json({
      fiscalYears: scope.fiscalYears,
      fiscalYear: scope.fiscalYear,
      affiliations: scope.affiliations,
      hospitals: scope.hospitals,
      rows,
      count: rows.reduce((sum, row) => sum + row.count, 0),
      transformedAt,
    });
  }).catch((error) => {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีตารางสรุป t_service_intype_error กรุณารอ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  });
}
