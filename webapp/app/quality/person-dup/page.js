"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import ModuleHeader from "@/components/module-header";

function formatBirth(value) {
  if (!value || !/^\d{8}$/.test(value)) return value || "-";
  const year = Number(value.slice(0, 4)) + 543;
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${year}`;
}

function formatSex(value) {
  if (value === "1") return "ชาย";
  if (value === "2") return "หญิง";
  return value || "-";
}

function formatDUpdate(value) {
  if (!value || !/^\d{8}/.test(value)) return value || "-";
  const year = Number(value.slice(0, 4)) + 543;
  const date = `${value.slice(6, 8)}/${value.slice(4, 6)}/${year}`;
  if (value.length >= 12) return `${date} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
  return date;
}

function formatTransformedAt(value) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function QualityPersonDupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHospcode, setSelectedHospcode] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    fetch("/api/quality/person-dup", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "โหลดข้อมูลไม่สำเร็จ");
        setData(payload);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const persons = data?.persons || [];

  const filteredPersons = useMemo(() => {
    if (!selectedHospcode) return persons;
    return persons.filter((person) =>
      person.entries.some((entry) => entry.hos === selectedHospcode)
    );
  }, [persons, selectedHospcode]);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ประชากร TYPE 1,3 ที่เลขบัตร 13 หลักเดียวกันซ้ำมากกว่า 1 หน่วยบริการ" />

        {error ? <div className="error">{error}</div> : null}

        <div className="personTargetToolbar">
          <label className="field">
            <span className="srOnly">กรองตามหน่วยบริการ</span>
            <select
              value={selectedHospcode}
              disabled={loading}
              onChange={(event) => setSelectedHospcode(event.target.value)}
            >
              <option value="">ทุกหน่วยบริการ</option>
              {(data?.hospcodes || []).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code}
                  {item.name ? ` ${item.name}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="tableMeta metaLine dupMetaRow">
          <span className="dupMetaSource">
            <RefreshCw aria-hidden="true" />
            {loading ? "…" : `ประมวลผลจากตารางสรุป t_person_type_1_3 เมื่อ : ${formatTransformedAt(data?.transformedAt)}`}
          </span>
          <span className="dupCountLabel">
            ทั้งหมด {filteredPersons.length.toLocaleString("th-TH")} คน
            <a
              className="exportXlsxLink"
              href={`/api/quality/person-dup/export${selectedHospcode ? `?hospcode=${encodeURIComponent(selectedHospcode)}` : ""}`}
              title="ส่งออกรายชื่อแบบปกปิดเป็น Excel"
            >
              <FileSpreadsheet aria-hidden="true" />
              <span className="srOnly">ส่งออก Excel</span>
            </a>
          </span>
        </div>

        <div className="tableWrap">
          <table className="fileTable personDupTable">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>หน่วยบริการ</th>
                <th className="numCol">PID</th>
                <th className="numCol">HN</th>
                <th className="numCol">TYPE</th>
                <th>เพศ</th>
                <th>วันเกิด</th>
                <th>ปรับปรุงล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersons.length ? (
                filteredPersons.map((person) => {
                  // hos ที่ d_update ใหม่สุดของคนนี้ — ขีดเส้นใต้แดงที่บรรทัด d_update
                  let latestIndex = -1;
                  let latestValue = "";
                  person.entries.forEach((entry, i) => {
                    if (entry.d_update && entry.d_update > latestValue) {
                      latestValue = entry.d_update;
                      latestIndex = i;
                    }
                  });
                  return (
                  <tr key={person.groupId}>
                    <td>
                      {person.entries.map((e, i) => (
                        <span key={i} className="dupLine">{e.name || "-"}</span>
                      ))}
                    </td>
                    <td className="fileCol">
                      {person.entries.map((entry, i) => (
                        <span key={i} className="dupLine">
                          {entry.hos}
                          {entry.hospname ? (
                            <span className="hospNameShort">{entry.hospname}</span>
                          ) : null}
                        </span>
                      ))}
                    </td>
                    <td className="numCol">
                      {person.entries.map((e, i) => (
                        <span key={i} className="dupLine">{e.pid || "-"}</span>
                      ))}
                    </td>
                    <td className="numCol">
                      {person.entries.map((e, i) => (
                        <span key={i} className="dupLine">{e.hn || "-"}</span>
                      ))}
                    </td>
                    <td className="numCol">
                      {person.entries.map((e, i) => (
                        <span key={i} className="dupLine">{e.type || "-"}</span>
                      ))}
                    </td>
                    <td>
                      {person.entries.map((e, i) => (
                        <span key={i} className="dupLine">{formatSex(e.sex)}</span>
                      ))}
                    </td>
                    <td>
                      {person.entries.map((e, i) => (
                        <span key={i} className="dupLine">{formatBirth(e.birth)}</span>
                      ))}
                    </td>
                    <td>
                      {person.entries.map((e, i) => (
                        <span
                          key={i}
                          className={`dupLine${i === latestIndex ? " dupLatest" : ""}`}
                        >
                          {formatDUpdate(e.d_update)}
                        </span>
                      ))}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={8}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบประชากรที่ซ้ำข้ามหน่วยบริการ"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
