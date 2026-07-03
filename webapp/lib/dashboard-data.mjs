export const MONTHS = [
  { key: "oct", label: "ต.ค.", value: "10" },
  { key: "nov", label: "พ.ย.", value: "11" },
  { key: "dec", label: "ธ.ค.", value: "12" },
  { key: "jan", label: "ม.ค.", value: "01" },
  { key: "feb", label: "ก.พ.", value: "02" },
  { key: "mar", label: "มี.ค.", value: "03" },
  { key: "apr", label: "เม.ย.", value: "04" },
  { key: "may", label: "พ.ค.", value: "05" },
  { key: "jun", label: "มิ.ย.", value: "06" },
  { key: "jul", label: "ก.ค.", value: "07" },
  { key: "aug", label: "ส.ค.", value: "08" },
  { key: "sep", label: "ก.ย.", value: "09" },
];

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;

export function quoteIdentifier(identifier) {
  if (!IDENTIFIER_RE.test(identifier || "")) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
}

export function chooseMonthlyDateColumn(columns) {
  const names = new Set(columns.map((column) => String(column).toLowerCase()));
  if (names.has("date_serv")) return "date_serv";
  if (names.has("date_admit")) return "date_admit";
  if (names.has("datetime_admit")) return "datetime_admit";
  if (names.has("datetime_serv")) return "datetime_serv";
  if (names.has("bdate")) return "bdate";
  return null;
}

export function chooseSelectedFile(files, requestedFile) {
  if (files.includes(requestedFile)) return requestedFile;
  if (files.includes("service")) return "service";
  return files[0] || "";
}

export function normalizeFiscalYear(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed >= 2400 ? parsed - 543 : parsed;
}

export function toFiscalYearLabel(fiscalYearAd) {
  return String(Number(fiscalYearAd) + 543);
}

export function getCurrentFiscalYearAd(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return month >= 10 ? year + 1 : year;
}

export function getRecentFiscalYearOptions(currentFiscalYearAd = getCurrentFiscalYearAd(), yearsBack = 5) {
  return Array.from({ length: yearsBack + 1 }, (_, index) => {
    const label = toFiscalYearLabel(currentFiscalYearAd - index);
    return { value: label, label };
  });
}

export function getFiscalYearRange(value) {
  const fiscalYearAd = normalizeFiscalYear(value);
  if (!fiscalYearAd) {
    throw new Error("Invalid fiscal year");
  }

  return {
    fiscalYearAd,
    start: `${fiscalYearAd - 1}1001`,
    end: `${fiscalYearAd}1001`,
  };
}

export function buildMonthlyCountExpressions(dateColumn) {
  const dateSql = datePrefixExpression(dateColumn);
  return MONTHS.map(
    (month) =>
      `SUM(CASE WHEN SUBSTRING(${dateSql}, 5, 2) = '${month.value}' THEN 1 ELSE 0 END) AS ${quoteIdentifier(month.key)}`
  ).join(", ");
}

export function datePrefixExpression(dateColumn) {
  return `LEFT(${quoteIdentifier(dateColumn)}, 8)`;
}

export function getMonthlyRowTotal(months, row) {
  return months.reduce((sum, month) => sum + Number(row?.[month.key] || 0), 0);
}

export function getFileTypeLabel(hasMonthly) {
  return hasMonthly ? "ประเภทแฟ้มบริการ" : "ประเภทแฟ้มสะสม";
}
