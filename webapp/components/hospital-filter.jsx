"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  const clearClickRef = useRef(false);
  const activeIndexRef = useRef(-1);
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
    activeIndexRef.current = -1;
    setActiveIndex(-1);
  }, [selectedHospital]);

  function selectHospital(hospcode) {
    onChange(hospcode);
    setOpen(false);
    activeIndexRef.current = -1;
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
        onMouseDown={(event) => {
          const { right } = event.currentTarget.getBoundingClientRect();
          const isNativeClear = Boolean(query) && event.clientX >= right - 36;
          clearClickRef.current = isNativeClear;
          if (!isNativeClear && !String(query || "").trim()) setOpen(true);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          const clearedByNativeControl = clearClickRef.current && !nextQuery;
          clearClickRef.current = false;
          setQuery(nextQuery);
          setOpen(clearedByNativeControl ? false : Boolean(nextQuery.trim()));
          activeIndexRef.current = -1;
          setActiveIndex(-1);
          if (value) onChange("");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            const nextIndex = Math.min(activeIndexRef.current + 1, visibleOptions.length - 1);
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            const nextIndex = activeIndexRef.current < 0
              ? visibleOptions.length - 1
              : Math.max(activeIndexRef.current - 1, 0);
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
          } else if (event.key === "Enter" && activeIndexRef.current >= 0) {
            event.preventDefault();
            selectHospital(visibleOptions[activeIndexRef.current].hospcode);
          } else if (event.key === "Escape") {
            setOpen(false);
            activeIndexRef.current = -1;
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
