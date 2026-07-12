import { ChevronUp, ChevronDown } from "lucide-react";

// เรียง rows ตาม column ที่เลือก (num/text) — ใช้ร่วมทุกหน้า /rapid
export function sortRows(rows, columns, sortKey, sortDir) {
  const column = columns.find((item) => item.key === sortKey) || columns[0];
  const sign = sortDir === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = left[column.key];
    const b = right[column.key];
    if (column.type === "num") return (Number(a || 0) - Number(b || 0)) * sign;
    return String(a || "").localeCompare(String(b || ""), "th") * sign;
  });
}

// หัวคอลัมน์ที่คลิก sort ได้ (อัปเดต query string ผ่าน onSort)
export function SortHeader({ column, sortKey, sortDir, onSort, rowSpan, colSpan }) {
  const active = sortKey === column.key;
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={[column.numCol ? "numCol" : "", column.className || ""].filter(Boolean).join(" ") || undefined}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className={`sortHeader${active ? " sortHeaderActive" : ""}`} onClick={() => onSort(column.key)}>
        {column.label}
        {active
          ? (sortDir === "asc" ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />)
          : <ChevronDown className="sortHeaderIdle" aria-hidden="true" />}
      </button>
    </th>
  );
}
