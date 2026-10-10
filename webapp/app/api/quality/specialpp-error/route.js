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
      tables: ["t_specialpp_error"],
      hospitalsPerYear: true,
      affiliationSource: "depShort",
    });
    if (scope.badRequest) return scope.badRequest;
    const transformedAt = await latestTransformAt(conn, "t_specialpp_error.sql");

    // รายการรายบุคคลของหน่วยบริการเดียว — export/route.js ใช้ชุดเดียวกันนี้
    if (searchParams.get("details") === "1") {
      if (!scope.hospcode) {
        return Response.json({ error: "ต้องระบุรหัสหน่วยบริการ" }, { status: 400 });
      }
      const [rawRows] = await conn.query(
        `SELECT hospcode, fiscal_year, pid, seq, date_serve, ppspecial, ppspecial_name, error_type
         FROM \`t_specialpp_error\`
         WHERE ${scope.where}
         ORDER BY date_serve DESC, pid, seq`,
        scope.values
      );
      const rows = rawRows.map((row) => ({ ...row, ...scope.hospitalOf(row.hospcode) }));
      return Response.json({ rows, count: rows.length, transformedAt, fiscalYear: scope.fiscalYear });
    }

    const [rawRows] = await conn.query(
      `SELECT hospcode,
        SUM(error_type = 'not_standard') AS not_standard,
        SUM(error_type = 'cancelled') AS cancelled,
        COUNT(*) AS total
       FROM \`t_specialpp_error\`
       WHERE ${scope.where}
       GROUP BY hospcode
       ORDER BY total DESC, hospcode`,
      scope.values
    );
    const rows = rawRows
      .filter((row) => scope.inAffiliation(row.hospcode))
      .map((row) => ({
        hospcode: row.hospcode,
        ...scope.hospitalOf(row.hospcode),
        not_standard: Number(row.not_standard),
        cancelled: Number(row.cancelled),
        total: Number(row.total),
      }));

    return Response.json({
      fiscalYears: scope.fiscalYears,
      fiscalYear: scope.fiscalYear,
      affiliations: scope.affiliations,
      hospitals: scope.hospitals,
      rows,
      notStandard: rows.reduce((sum, row) => sum + row.not_standard, 0),
      cancelled: rows.reduce((sum, row) => sum + row.cancelled, 0),
      count: rows.reduce((sum, row) => sum + row.total, 0),
      transformedAt,
    });
  }).catch((error) => {
    const message = error?.code === "ER_NO_SUCH_TABLE"
      ? "ยังไม่มีตารางสรุป t_specialpp_error กรุณารอ transform ทำงานก่อน"
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  });
}
