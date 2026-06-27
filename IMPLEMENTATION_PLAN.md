# Raw-Records Modal Implementation Plan

## Overview
Click a non-zero month cell on `/dashboard/hos-list` → modal opens showing raw records filtered by hospcode + month, with server-side pagination. All columns shown except `cid_aes` and `log_import_id`.

---

## Step 1 — New API Route

**File**: `webapp/app/api/raw-records/route.js` (create)

**Params**: `file`, `hospcode`, `monthValue` (e.g. "10"), `fiscalYear` (Buddhist year, e.g. "2568"), `page`, `limit`

**Logic**:
1. Require JWT auth (same as dashboard route)
2. Validate `file` exists in `c_file`
3. Detect date column via `chooseMonthlyDateColumn()` from `dashboard-data.mjs`
4. Build `fiscalYearAd = normalizeFiscalYear(fiscalYear)` then `getFiscalYearRange(fiscalYearAd)`
5. Query columns from `information_schema`, exclude `cid_aes` and `log_import_id` in JS
6. COUNT query: `COUNT(*)` with WHERE `hospcode = ?` AND `SUBSTRING(LEFT(dateCol, 8), 5, 2) = ?` AND `LEFT(dateCol, 8) >= ? AND LEFT(dateCol, 8) < ?`
7. SELECT query: same WHERE, `LIMIT ? OFFSET ?`, select only the allowed columns (build comma-separated list from step 5)
8. Return: `{ total, page, limit, columns, rows }`

**Key imports** (reuse from `dashboard-data.mjs`):
```
chooseMonthlyDateColumn, datePrefixExpression, getFiscalYearRange,
normalizeFiscalYear, quoteIdentifier, MONTHS
```

**WHERE clause construction**:
```js
const dateSql = datePrefixExpression(dateColumn); // LEFT(`date_serv`, 8)
const range = getFiscalYearRange(normalizeFiscalYear(fiscalYear));
// range.start = "20241001", range.end = "20251001"

// Build param array: [hospcode, monthValue, range.start, range.end, ...limitOffset]
const whereClause = `
  hospcode = ?
  AND SUBSTRING(${dateSql}, 5, 2) = ?
  AND ${dateSql} >= ?
  AND ${dateSql} < ?
`;
```

**Column filtering** (in JS, not SQL):
```js
const excludedColumns = new Set(["cid_aes", "log_import_id"]);
const allowedColumns = columns.filter((col) => !excludedColumns.has(col));
```

---

## Step 2 — Add Modal State to Hos-List Page

**File**: `webapp/app/dashboard/hos-list/page.js`

Add new state object import and modal state (after existing state lines ~30-34):

```js
import { ChevronLeft, ChevronRight, X } from "lucide-react";
```

```js
const PAGE_SIZE = 50;

const [rawModal, setRawModal] = useState({
  open: false,
  loading: false,
  error: null,
  hospcode: null,
  monthLabel: null,
  columns: [],
  rows: [],
  total: 0,
  page: 1,
});
```

Add a helper to open the modal (place before the `return`):

```js
function openRawModal(hospcode, monthKey, monthLabel, monthValue) {
  setRawModal({
    open: true, loading: true, error: null,
    hospcode, monthLabel, columns: [], rows: [], total: 0, page: 1,
  });
  fetchRawRecords(hospcode, monthValue, 1);
}

function fetchRawRecords(hospcode, monthValue, page) {
  setRawModal((s) => ({ ...s, loading: true, error: null, page }));
  fetch(
    `/api/raw-records?file=${encodeURIComponent(selectedFile)}`
    + `&hospcode=${encodeURIComponent(hospcode)}`
    + `&monthValue=${encodeURIComponent(monthValue)}`
    + `&fiscalYear=${encodeURIComponent(selectedFiscalYear)}`
    + `&page=${page}&limit=${PAGE_SIZE}`
  )
    .then((res) => res.json().then((p) => ({ ok: res.ok, payload: p })))
    .then(({ ok, payload }) => {
      if (!ok) throw new Error(payload.error || "Failed");
      setRawModal((s) => ({
        ...s, loading: false,
        columns: payload.columns, rows: payload.rows, total: payload.total,
      }));
    })
    .catch((err) => setRawModal((s) => ({ ...s, loading: false, error: err.message })));
}

function closeRawModal() {
  setRawModal((s) => ({ ...s, open: false }));
}

function goRawPage(dir) {
  const next = rawModal.page + dir;
  if (next < 1) return;
  fetchRawRecords(rawModal.hospcode, /* need monthValue — store it too */);
}
```

Full refined state (add `monthValue`):

```js
const [rawModal, setRawModal] = useState({
  open: false, loading: false, error: null,
  hospcode: null, monthLabel: null, monthValue: null,
  columns: [], rows: [], total: 0, page: 1,
});
```

Then `goRawPage`:
```js
function goRawPage(dir) {
  const next = rawModal.page + dir;
  if (next < 1) return;
  fetchRawRecords(rawModal.hospcode, rawModal.monthValue, next);
}
```

---

## Step 3 — Make Month Cells Clickable

**File**: `webapp/app/dashboard/hos-list/page.js`

Change this (lines 224-228):
```jsx
months.map((month) => (
  <td key={month.key} className="numCol monthCol">
    {formatNumber(row[month.key])}
  </td>
))
```

To:
```jsx
months.map((month) => {
  const count = row[month.key];
  if (count > 0) {
    return (
      <td
        key={month.key}
        className="numCol monthCol clickableMonthCol"
        onClick={() => openRawModal(row.hospcode, month.key, month.label, month.value)}
      >
        {formatNumber(count)}
      </td>
    );
  }
  return (
    <td key={month.key} className="numCol monthCol">
      {formatNumber(count)}
    </td>
  );
})
```

---

## Step 4 — Render Modal JSX

**File**: `webapp/app/dashboard/hos-list/page.js`

Add the modal block after `</section>` but before `</div>` (i.e., after line 252, before the closing `main` div):

```jsx
{rawModal.open ? (
  <div className="reportModalBackdrop" role="presentation" onClick={closeRawModal}>
    <section
      className="reportModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="reportModalHeader">
        <div>
          <h2 id="raw-modal-title">
            {selectedFile} — {rawModal.hospcode} — {rawModal.monthLabel}
          </h2>
          <p>
            {rawModal.loading
              ? "กำลังโหลด..."
              : `${rawModal.total.toLocaleString()} รายการ`}
          </p>
        </div>
        <button type="button" className="reportModalClose" onClick={closeRawModal} aria-label="ปิด">
          <X aria-hidden="true" />
        </button>
      </div>

      {rawModal.error ? <div className="error">{rawModal.error}</div> : null}

      <div className="tableWrap reportResultWrap">
        <table className="fileTable">
          <thead>
            <tr>
              {rawModal.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawModal.loading ? (
              <tr>
                <td className="emptyCell" colSpan={rawModal.columns.length || 1}>
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : rawModal.rows.length ? (
              rawModal.rows.map((row, i) => (
                <tr key={i}>
                  {rawModal.columns.map((col) => (
                    <td key={col}>{formatCell(row[col])}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="emptyCell" colSpan={rawModal.columns.length || 1}>
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rawModal.total > PAGE_SIZE ? (
        <div className="pagination">
          <button disabled={rawModal.page <= 1} onClick={() => goRawPage(-1)}>
            <ChevronLeft aria-hidden="true" />
            ก่อน
          </button>
          <span>
            หน้า {rawModal.page} / {Math.ceil(rawModal.total / PAGE_SIZE)}
          </span>
          <button
            disabled={rawModal.page >= Math.ceil(rawModal.total / PAGE_SIZE)}
            onClick={() => goRawPage(1)}
          >
            ถัดไป
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  </div>
) : null}
```

Also add a `formatCell` helper (borrow from report page):
```js
function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}
```

---

## Step 5 — CSS Addition

**File**: `webapp/app/globals.css`

Add after the existing `.monthCol` / `.totalCol` rules (around line 76 in the full file, or wherever those are defined):

```css
.clickableMonthCol {
  cursor: pointer;
  color: var(--accent);
  font-weight: 700;
}
.clickableMonthCol:hover {
  background: var(--accent-soft);
  text-decoration: underline;
}
```

No new CSS classes beyond that — the modal reuses `.reportModalBackdrop`, `.reportModal`, `.reportModalHeader`, `.reportModalClose`, `.reportResultWrap`, `.fileTable`, `.emptyCell`, and the pagination reuses `.pagination`. All of these already exist in `globals.css`.

---

## Verification Checklist

1. API returns 400 for missing `file`/`hospcode`/`monthValue`
2. Clicking a cell with count > 0 opens modal with correct title (file + hospcode + month)
3. Modal shows all columns except `cid_aes` and `log_import_id`
4. Pagination navigates correctly, Prev disabled on page 1, Next disabled on last page
5. Clicking backdrop or X closes modal
6. Loading and error states render correctly
7. Cell with count === 0 is NOT clickable (no cursor:pointer, no onClick)
8. Works for all month columns (oct through sep)
