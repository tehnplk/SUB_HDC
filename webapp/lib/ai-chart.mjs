export const MAX_AI_CHART_ROWS = 12;
const MIN_AI_CHART_ROWS = 2;
const CHART_REQUEST_PATTERN = /\b(chart|graph|plot|visuali[sz]e|bar chart|line chart|pie chart)\b|กราฟ|แผนภูมิ|ชาร์ต/i;
const CHART_NEGATION_PATTERN =
  /\b(no|without|dont|don't|do not|not)\s+(?:show\s+|display\s+|create\s+|make\s+)?(?:a\s+)?(?:chart|graph|plot)\b|ไม่(?:ต้อง|เอา|แสดง|ต้องการ).{0,12}(?:กราฟ|แผนภูมิ|ชาร์ต)/i;

const FIELD_LABELS = new Map([
  ["cnt", "Count"],
  ["count", "Count"],
  ["total", "Total"],
  ["sum", "Total"],
  ["amount", "Amount"],
  ["qty", "Quantity"],
  ["cases", "Cases"],
  ["visits", "Visits"],
  ["patients", "Patients"],
  ["person", "Person"],
  ["people", "People"],
  ["population", "Population"],
  ["diagcode", "Diagnosis code"],
  ["diag_code", "Diagnosis code"],
  ["icd10", "ICD-10"],
  ["sex", "Sex"],
  ["gender", "Gender"],
  ["file_name", "Table"],
  ["type", "Type"],
  ["note", "Note"],
]);

const VALUE_FIELD_PATTERNS = [
  /^cnt$/i,
  /^count$/i,
  /^total$/i,
  /^sum$/i,
  /^amount$/i,
  /^qty$/i,
  /^cases$/i,
  /^visits$/i,
  /^patients$/i,
  /count/i,
  /total/i,
];

function getColumns(result) {
  if (Array.isArray(result?.columns) && result.columns.length) return result.columns;
  const firstRow = Array.isArray(result?.rows) ? result.rows[0] : null;
  return firstRow && typeof firstRow === "object" ? Object.keys(firstRow) : [];
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value !== "string") return null;

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function scoreValueField(field) {
  const patternIndex = VALUE_FIELD_PATTERNS.findIndex((pattern) => pattern.test(field));
  return patternIndex === -1 ? 0 : VALUE_FIELD_PATTERNS.length - patternIndex;
}

function pickValueField(rows, columns) {
  const candidates = columns
    .map((field) => {
      const numericCount = rows.reduce((count, row) => (toNumber(row?.[field]) === null ? count : count + 1), 0);
      return {
        field,
        numericCount,
        score: scoreValueField(field),
      };
    })
    .filter((candidate) => candidate.numericCount > 0)
    .sort((a, b) => b.score - a.score || b.numericCount - a.numericCount);

  return candidates[0]?.field || null;
}

function pickLabelField(columns, valueField) {
  return columns.find((field) => field !== valueField) || null;
}

function formatTitle(labelField, valueField) {
  if (!labelField || !valueField) return "DbQuery chart";
  return `${formatFieldLabel(valueField)} by ${formatFieldLabel(labelField)}`;
}

function formatFieldLabel(field) {
  const normalized = String(field || "").trim();
  if (!normalized) return "";

  const mapped = FIELD_LABELS.get(normalized.toLowerCase());
  if (mapped) return mapped;

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildChartFromDbResult(result) {
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  if (!result?.ok || !rows.length) return null;

  const columns = getColumns(result);
  const valueField = pickValueField(rows, columns);
  const labelField = pickLabelField(columns, valueField);

  if (!valueField || !labelField) return null;

  const chartRows = rows
    .slice(0, MAX_AI_CHART_ROWS)
    .map((row, index) => ({
      label: String(row?.[labelField] ?? index + 1).slice(0, 90),
      value: toNumber(row?.[valueField]),
    }))
    .filter((row) => row.label && row.value !== null);

  if (chartRows.length < MIN_AI_CHART_ROWS) return null;

  return {
    type: "bar",
    title: formatTitle(labelField, valueField),
    labelField,
    valueField,
    rows: chartRows,
  };
}

export function userRequestedChart(messages) {
  const source = Array.isArray(messages) ? messages : [{ content: messages }];
  const latestUserMessage = source.findLast?.((message) => message?.role === "user" && message?.content)
    || [...source].reverse().find((message) => message?.role === "user" && message?.content)
    || source[source.length - 1];
  const content = String(latestUserMessage?.content || "");

  return CHART_REQUEST_PATTERN.test(content) && !CHART_NEGATION_PATTERN.test(content);
}
