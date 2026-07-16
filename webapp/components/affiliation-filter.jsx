"use client";

export default function AffiliationFilter({
  value,
  affiliations = [],
  onChange,
  disabled = false,
  label = "เลือกสังกัด",
  allLabel = "ทุกสังกัด",
  className = "field",
}) {
  return (
    <label className={className}>
      <span className="srOnly">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{allLabel}</option>
        {affiliations.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
  );
}
