import { createDbConnection } from "@/lib/db";
import { isImporting } from "@/lib/import-status.mjs";
import { cacheGetJson, cacheSetJson } from "@/lib/redis.mjs";
import { CACHE_TTL_SECONDS, hosListCacheKey, isCachedFile } from "@/lib/dashboard-cache.mjs";
import {
  getHospNameMap,
  getMonthlyRows,
  getTableColumns,
  getTotalRows,
} from "@/lib/hos-list-query.mjs";
import {
  MONTHS,
  chooseMonthlyDateColumn,
  chooseSelectedFile,
  getCurrentFiscalYearAd,
  getRecentFiscalYearOptions,
  normalizeFiscalYear,
  quoteIdentifier,
  toFiscalYearLabel,
} from "@/lib/dashboard-data.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  let conn;
  try {
    const url = new URL(request.url);
    conn = await createDbConnection();

    const isSummary = url.searchParams.get("summary") === "true";
    if (isSummary) {
      const requestedHospcode = url.searchParams.get("hospcode") || "";
      const [fileRows] = await conn.query("SELECT file_name FROM c_file ORDER BY file_name");
      const fileMetas = await Promise.all(
        fileRows.map(async (row) => {
          const columns = await getTableColumns(conn, row.file_name);
          return {
            filename: row.file_name,
            hasHospcode: columns.includes("hospcode"),
          };
        })
      );
      const hospcodeGroups = await Promise.all(
        fileMetas
          .filter((file) => file.hasHospcode)
          .map(async (file) => {
            const [rows] = await conn.query(
              `SELECT DISTINCT hospcode FROM ${quoteIdentifier(file.filename)} WHERE hospcode IS NOT NULL AND hospcode != ''`
            );
            return rows.map((row) => row.hospcode);
          })
      );
      const hospcodes = Array.from(new Set(hospcodeGroups.flat())).sort();
      const selectedHospcode = hospcodes.includes(requestedHospcode) ? requestedHospcode : "";
      const filesSummary = await Promise.all(
        fileMetas.map(async (file) => {
          const canFilterHospcode = selectedHospcode && file.hasHospcode;
          const tableSql = quoteIdentifier(file.filename);
          let cntRows = [{ cnt: 0 }];
          if (!selectedHospcode) {
            [cntRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM ${tableSql}`);
          } else if (canFilterHospcode) {
            [cntRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM ${tableSql} WHERE hospcode = ?`, [selectedHospcode]);
          }

          return {
            filename: file.filename,
            row_count: Number(cntRows[0].cnt || 0),
          };
        })
      );

      const totalFiles = filesSummary.length;
      const filesWithData = filesSummary.filter((f) => f.row_count > 0).length;
      const totalRows = filesSummary.reduce((sum, f) => sum + f.row_count, 0);

      return Response.json({
        totalFiles,
        filesWithData,
        totalRows,
        files: filesSummary,
        hospcodes,
        selectedHospcode,
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    const isLogImport = url.searchParams.get("logImport") === "true";
    if (isLogImport) {
      // Lazy-load ทีละหน้า (20 แถว) แทนโหลด 500 แถวรวดเดียว — tab/ค้นหา filter
      // ที่ SQL, default sort id ล่าสุดก่อน (ลำดับการสร้างรายการนำเข้า)
      const LOG_IMPORT_PAGE_SIZE = 20;
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const statusTab = url.searchParams.get("status") || "success";
      const q = (url.searchParams.get("q") || "").trim();

      const statusesByTab = {
        success: ["complete"],
        failed: ["not_complate", "no_complete"],
        pending: ["pending", "processing"],
      };
      const statuses = statusesByTab[statusTab] || statusesByTab.success;

      const where = [`status IN (${statuses.map(() => "?").join(", ")})`];
      const params = [...statuses];
      if (q) {
        where.push("(file_name LIKE ? OR CAST(id AS CHAR) LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
      }
      const whereSql = `WHERE ${where.join(" AND ")}`;

      // จำนวนต่อ tab นับจากทั้งตาราง (ไม่ผูกกับคำค้น — พฤติกรรมเดิมของหน้า)
      const [countRows] = await conn.query(
        "SELECT status, COUNT(*) AS n FROM log_import_file GROUP BY status"
      );
      const counts = { success: 0, failed: 0, pending: 0 };
      for (const row of countRows) {
        if (row.status === "complete") counts.success += Number(row.n);
        else if (row.status === "not_complate" || row.status === "no_complete") counts.failed += Number(row.n);
        else if (row.status === "pending" || row.status === "processing") counts.pending += Number(row.n);
      }

      const [[{ total }]] = await conn.query(
        `SELECT COUNT(*) AS total FROM log_import_file ${whereSql}`,
        params
      );

      const [rows] = await conn.query(
        `SELECT id, file_name, file_size, import_date_time, status, finish_date_time, not_complete_msg, progress_percent
         FROM log_import_file
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, LOG_IMPORT_PAGE_SIZE, (page - 1) * LOG_IMPORT_PAGE_SIZE]
      );
      return Response.json({
        rows: rows.map((r) => ({
          id: Number(r.id),
          file_name: r.file_name,
          file_size: r.file_size == null ? null : Number(r.file_size),
          import_date_time: r.import_date_time,
          status: r.status,
          progress_percent:
            r.status === "processing" && r.progress_percent != null
              ? Number(r.progress_percent)
              : null,
          finish_date_time: r.finish_date_time,
          not_complete_msg: r.not_complete_msg,
        })),
        total: Number(total),
        page,
        pageSize: LOG_IMPORT_PAGE_SIZE,
        counts,
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    const isQuality = url.searchParams.get("quality") === "true";
    if (isQuality) {
      const [hospcodeRows] = await conn.query("SELECT DISTINCT hospcode FROM data_correct WHERE hospcode IS NOT NULL AND hospcode != '' ORDER BY hospcode");
      const [tablenameRows] = await conn.query("SELECT DISTINCT tablename FROM data_correct WHERE tablename IS NOT NULL AND tablename != '' ORDER BY tablename");

      const requestedHospcode = url.searchParams.get("hospcode");
      const requestedTablename = url.searchParams.get("tablename");

      let queryParams = [];
      let queryConditions = [];
      if (requestedHospcode) {
        queryConditions.push("hospcode = ?");
        queryParams.push(requestedHospcode);
      }
      if (requestedTablename) {
        queryConditions.push("tablename = ?");
        queryParams.push(requestedTablename);
      }

      const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(" AND ")}` : "";

      const [rows] = await conn.query(
        `SELECT hospcode, tablename, data_correct, d_update, log_import_id 
         FROM data_correct 
         ${whereClause} 
         ORDER BY d_update DESC`,
        queryParams
      );

      const [[{ uniqueHospcodes }]] = await conn.query("SELECT COUNT(DISTINCT hospcode) AS uniqueHospcodes FROM data_correct");
      const [[{ uniqueTablenames }]] = await conn.query("SELECT COUNT(DISTINCT tablename) AS uniqueTablenames FROM data_correct");

      return Response.json({
        rows: rows.map((r) => ({
          ...r,
          log_import_id: r.log_import_id ? Number(r.log_import_id) : null,
        })),
        hospcodes: hospcodeRows.map((r) => r.hospcode),
        tablenames: tablenameRows.map((r) => r.tablename),
        totalRows: rows.length,
        uniqueHospcodes: Number(uniqueHospcodes || 0),
        uniqueTablenames: Number(uniqueTablenames || 0),
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    // ระหว่างมีการนำเข้า ตารางใหญ่ถูก LOAD DATA เขียนอยู่ การนับสด (GROUP BY
    // ทั้งตาราง) จะแย่ง disk I/O กับ import ทำให้ทั้งหน้าจอและ import ช้าลงมาก
    // จึงตอบ importing กลับไปให้หน้าจอแสดงข้อความแทน ไม่แตะตารางใหญ่เลย
    if (await isImporting(conn)) {
      return Response.json({
        importing: true,
        files: [],
        selectedFile: "",
        selectedFiscalYear: "",
        fiscalYears: [],
        hasMonthly: false,
        dateColumn: null,
        months: MONTHS,
        rows: [],
        totalRows: 0,
        centerName: process.env.CENTER_NAME || "เมือง",
      });
    }

    const [fileRows] = await conn.query("SELECT file_name FROM c_file ORDER BY file_name");
    const files = fileRows.map((row) => row.file_name);
    const requestedFile = url.searchParams.get("file");
    const selectedFile = chooseSelectedFile(files, requestedFile);

    if (!selectedFile) {
      return Response.json({
        files: [],
        selectedFile: "",
        selectedFiscalYear: "",
        fiscalYears: [],
        hasMonthly: false,
        dateColumn: null,
        months: MONTHS,
        rows: [],
        totalRows: 0,
      });
    }

    const columns = await getTableColumns(conn, selectedFile);
    const dateColumn = chooseMonthlyDateColumn(columns);
    const hasMonthly = Boolean(dateColumn);

    let fiscalYears = [];
    let selectedFiscalYear = "";
    let rows = [];

    if (hasMonthly) {
      const fiscalYearOptions = getRecentFiscalYearOptions();
      const fiscalYearAds = fiscalYearOptions.map((year) => normalizeFiscalYear(year.value));
      const fallbackYear = getCurrentFiscalYearAd();
      const requestedFiscalYear = normalizeFiscalYear(url.searchParams.get("fiscalYear")) || fallbackYear;
      const selectedFiscalYearAd = fiscalYearAds.includes(requestedFiscalYear)
        ? requestedFiscalYear
        : fallbackYear;

      fiscalYears = fiscalYearOptions;
      selectedFiscalYear = toFiscalYearLabel(selectedFiscalYearAd);

      // แฟ้มใหญ่ (charge/diagnosis opd+ipd, labfu) นับสด GROUP BY ช้ามาก (charge_opd
      // ~13 นาที) — อ่านผลที่ summarize นับล่วงหน้าไว้ใน Redis. miss (cache ยังไม่ถูก
      // สร้าง/หมดอายุ/Redis ล่ม) → นับสดแล้วเขียนกลับ (self-heal) ครั้งถัดไปจึงเร็ว
      if (isCachedFile(selectedFile)) {
        const cacheKey = hosListCacheKey(selectedFile, selectedFiscalYear);
        const cached = await cacheGetJson(cacheKey);
        if (cached) {
          rows = cached;
        } else {
          rows = await getMonthlyRows(conn, selectedFile, dateColumn, selectedFiscalYearAd);
          await cacheSetJson(cacheKey, rows, CACHE_TTL_SECONDS);
        }
      } else {
        rows = await getMonthlyRows(conn, selectedFile, dateColumn, selectedFiscalYearAd);
      }
    } else {
      rows = await getTotalRows(conn, selectedFile);
    }

    const totalRows = rows.reduce((sum, row) => {
      if (!hasMonthly) return sum + row.total;
      return sum + MONTHS.reduce((monthSum, month) => monthSum + row[month.key], 0);
    }, 0);

    return Response.json({
      files: files.map((fileName) => ({ fileName })),
      selectedFile,
      selectedFiscalYear,
      fiscalYears,
      hasMonthly,
      dateColumn,
      months: MONTHS,
      rows,
      totalRows,
      // ชื่อย่อหน่วยบริการแสดงคู่ hospcode — merge สดทุก response ไม่ผูกกับ cache
      hospNames: await getHospNameMap(conn),
      centerName: process.env.CENTER_NAME || "เมือง",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
