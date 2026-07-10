// นับสรุป hos-list ของแฟ้มใหญ่ล่วงหน้าเก็บลง Redis เพื่อให้หน้าจออ่านได้ทันที
// เรียกจาก summarize_daemon.js (loop ทุก 24 ชม.) — logic แยกไว้ที่นี่เพื่อ test ได้
import { cacheSetJson } from "./redis.mjs";
import {
  CACHE_TTL_SECONDS,
  CACHED_FILES,
  hosListCacheKey,
} from "./dashboard-cache.mjs";
import {
  chooseMonthlyDateColumn,
  getCurrentFiscalYearAd,
  toFiscalYearLabel,
} from "./dashboard-data.mjs";
import {
  getMonthlyRows,
  getTableColumns,
} from "./hos-list-query.mjs";

// นับปีงบปัจจุบัน + ย้อนหลัง 1 พอ (yearsBack=1) — ข้อมูลปีเก่ากว่านั้นแทบไม่ถูกเปิด
// ดู แต่ถ้ามีคนเปิด route จะนับสด+เขียน cache เอง (self-heal) ไม่พลาด
export function fiscalYearsToWarm(currentFiscalYearAd = getCurrentFiscalYearAd(), yearsBack = 1) {
  return Array.from({ length: yearsBack + 1 }, (_, i) => currentFiscalYearAd - i);
}

// นับ + เขียน cache ของแฟ้มเดียว ทุกปีงบที่ warm — คืนจำนวน key ที่เขียนสำเร็จ
export async function summarizeFile(conn, fileName, fiscalYearAds) {
  const columns = await getTableColumns(conn, fileName);
  const dateColumn = chooseMonthlyDateColumn(columns);
  if (!dateColumn) {
    // แฟ้มใน CACHED_FILES ควรมี date column เสมอ — ถ้าไม่มีข้ามไป กัน crash
    return 0;
  }

  let written = 0;
  for (const fiscalYearAd of fiscalYearAds) {
    const rows = await getMonthlyRows(conn, fileName, dateColumn, fiscalYearAd);
    const key = hosListCacheKey(fileName, toFiscalYearLabel(fiscalYearAd));
    // นับเฉพาะที่เขียน Redis สำเร็จจริง — Redis ล่มแล้ว log "warmed" เกินจริง
    // จะหลอกคนอ่าน log ว่า cache พร้อมทั้งที่ว่างเปล่า
    if (await cacheSetJson(key, rows, CACHE_TTL_SECONDS)) {
      written += 1;
    }
  }
  return written;
}

// รอบ summarize เต็ม: วนทุกแฟ้มใน CACHED_FILES × ปีงบที่ warm
// แฟ้มหนึ่งพัง (เช่นตารางหาย) ไม่ควรล้มทั้งรอบ — จับ error ราย file แล้วไปต่อ
// shouldAbort ถูกเช็คก่อนเริ่มแต่ละแฟ้ม: รอบเต็มที่ อ.เมือง ยาว 30-60 นาที
// (charge_opd เดียว ~13 นาที) ถ้า import เข้ามากลางรอบต้องหยุดทันที ไม่แย่ง
// disk I/O กับ LOAD DATA — poll ของ daemon จะกลับมาทำรอบใหม่เองเมื่อ import จบ
export async function runSummarizeCycle(conn, {
  files = CACHED_FILES,
  fiscalYearAds = fiscalYearsToWarm(),
  logger = console,
  shouldAbort = null,
} = {}) {
  const summary = { files: 0, keys: 0, errors: 0, aborted: false };
  for (const fileName of files) {
    if (shouldAbort && (await shouldAbort())) {
      summary.aborted = true;
      logger.log("[summarize] import started, aborting cycle mid-way");
      break;
    }
    try {
      const written = await summarizeFile(conn, fileName, fiscalYearAds);
      summary.files += 1;
      summary.keys += written;
      logger.log(`[summarize] ${fileName}: warmed ${written} fiscal year(s)`);
    } catch (error) {
      summary.errors += 1;
      logger.error(`[summarize] ${fileName} failed: ${error.message}`);
    }
  }
  return summary;
}
