"use client";

export default function FiscalYearFilter({
  value,
  years = [],
  onChange,
  disabled = false,
  label = "เลือกปีงบประมาณ",
  showLabel = false,
  className = "field",
}) {
  return (
    <label className={className}>
      <span className={showLabel ? "" : "srOnly"}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {years.map((year) => <option key={year} value={year}>ปีงบประมาณ {year}</option>)}
      </select>
    </label>
  );
}
