"use client";

import { useEffect, useId, useMemo, useState } from "react";

export function filterHospitalOptions(hospitals, query) {
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase("th-TH");
  if (!normalizedQuery) return hospitals;

  return hospitals.filter((hospital) =>
    String(hospital.hospcode || "").toLocaleLowerCase("th-TH").includes(normalizedQuery)
    || String(hospital.hospname || "").toLocaleLowerCase("th-TH").includes(normalizedQuery)
  );
}

function hospitalLabel(hospital) {
  return `${hospital.hospcode || ""}${hospital.hospname ? ` — ${hospital.hospname}` : ""}`;
}

export default function HospitalFilter({
  value,
  onChange,
  hospitals = [],
  disabled = false,
  label = "เลือกหน่วยบริการ",
  allLabel = "ทุกหน่วยบริการ",
  className = "field",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.hospcode === value),
    [hospitals, value]
  );
  const matches = useMemo(
    () => filterHospitalOptions(hospitals, query),
    [hospitals, query]
  );
  const visibleOptions = useMemo(() => [
    { hospcode: "", label: allLabel },
    ...matches.map((hospital) => ({ hospcode: hospital.hospcode, label: hospitalLabel(hospital) })),
  ], [allLabel, matches]);

  useEffect(() => {
    setQuery(selectedHospital ? hospitalLabel(selectedHospital) : "");
    setActiveIndex(-1);
  }, [selectedHospital]);

  function selectHospital(hospcode) {
    onChange(hospcode);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className={`hospitalFilter ${className}`}>
      <label className="srOnly" htmlFor={listboxId}>{label}</label>
      <input
        id={listboxId}
        className="hospitalFilterInput"
        type="search"
        value={query}
        disabled={disabled}
        placeholder="ค้นหารหัสหรือชื่อหน่วยบริการ"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`${listboxId}-options`}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (value) onChange("");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, visibleOptions.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => index < 0 ? visibleOptions.length - 1 : Math.max(index - 1, 0));
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectHospital(visibleOptions[activeIndex].hospcode);
          } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {open ? (
        <div id={`${listboxId}-options`} className="hospitalFilterOptions" role="listbox" aria-label={label}>
          {visibleOptions.map((option, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={option.hospcode || "all"}
              type="button"
              role="option"
              aria-selected={option.hospcode === value}
              className={index === activeIndex ? "hospitalFilterOptionActive" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectHospital(option.hospcode)}
            >
              {option.label}
            </button>
          ))}
          {!matches.length && String(query || "").trim() ? <p>ไม่พบหน่วยบริการ</p> : null}
        </div>
      ) : null}
    </div>
  );
}
