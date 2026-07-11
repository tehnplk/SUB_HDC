"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Database, FileCode2, RefreshCw, Search, TableProperties, X } from "lucide-react";
import ModuleHeader from "@/components/module-header";

export default function TransformDataDictionaryPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedModal, setSelectedModal] = useState(null);
  const [copied, setCopied] = useState(false);

  function openModal(type, row) {
    setCopied(false);
    setSelectedModal({ type, row });
  }

  function closeModal() {
    setCopied(false);
    setSelectedModal(null);
  }

  async function copySqlCode() {
    const sqlCode = selectedModal?.row?.sql_code;
    if (!sqlCode) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sqlCode);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = sqlCode;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function loadDictionary(isRefresh = false) {
    setError("");
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch("/api/dev/transform-data-dict", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load data");
      setRows(payload.rows || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDictionary();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => [
      row.transform_table,
      row.sql_file,
      row.f43_tables.join(","),
      row.stored_data,
      row.schema,
    ].join(" ").toLowerCase().includes(query));
  }, [rows, search]);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="พจนานุกรมข้อมูลของตารางที่สร้างจาก Transform" />

        <div className="transformDictToolbar">
          <label className="field transformDictSearch">
            <span className="srOnly">ค้นหา Transform</span>
            <div className="inputWithIcon">
              <Search aria-hidden="true" />
              <input
                className="fieldInput reportSearchInput"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาตาราง, SQL, F43 หรือ schema"
              />
            </div>
          </label>
          <button
            type="button"
            className="transformDictRefresh"
            onClick={() => loadDictionary(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw aria-hidden="true" className={refreshing ? "personTargetSpin" : ""} />
            รีเฟรช
          </button>
        </div>

        <div className="tableMeta transformDictMeta">
          <span><TableProperties aria-hidden="true" /> {loading ? "กำลังโหลด Data Dictionary..." : `แสดง ${filteredRows.length} จาก ${rows.length} transform`}</span>
          <span><Database aria-hidden="true" /> Source: transform/transform_data_dic.json</span>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="tableWrap transformDictGridWrap">
          <table className="fileTable transformDictGrid">
            <thead>
              <tr>
                <th>#</th>
                <th>transform_table</th>
                <th>sql_file</th>
                <th>f43_tables</th>
                <th>stored_data</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? filteredRows.map((row, index) => (
                <tr key={row.id}>
                  <td className="transformDictIndex">{index + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="transformDictTableName"
                      onClick={() => openModal("schema", row)}
                      aria-label={`ดู schema ของ ${row.transform_table}`}
                    >
                      {row.transform_table}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="transformDictSqlFile"
                      onClick={() => openModal("sql", row)}
                      aria-label={`ดู SQL code ของ ${row.sql_file}`}
                    >
                      <FileCode2 aria-hidden="true" />{row.sql_file}
                    </button>
                  </td>
                  <td>
                    <div className="transformDictTags">
                      {row.f43_tables.map((tableName) => <span key={tableName}>{tableName}</span>)}
                    </div>
                  </td>
                  <td className="transformDictDescription">{row.stored_data}</td>
                </tr>
              )) : (
                <tr className="emptyRow">
                  <td colSpan={5}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบ Transform ที่ตรงกับคำค้นหา"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedModal ? (
          <div className="transformSchemaModalBackdrop" role="presentation" onMouseDown={closeModal}>
            <section
              className="transformSchemaModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="transform-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="transformSchemaModalHeader">
                <div>
                  <p className="eyebrow">{selectedModal.type === "sql" ? "SQL code" : "Schema"}</p>
                  <h2 id="transform-modal-title">
                    {selectedModal.type === "sql" ? selectedModal.row.sql_file : selectedModal.row.transform_table}
                  </h2>
                </div>
                <div className="transformSchemaModalActions">
                  {selectedModal.type === "sql" ? (
                    <button
                      type="button"
                      className="transformSqlCopyButton"
                      onClick={copySqlCode}
                      disabled={!selectedModal.row.sql_code}
                    >
                      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="transformSchemaModalClose"
                    onClick={closeModal}
                    aria-label="ปิด Modal"
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </div>
              {selectedModal.type === "sql" ? (
                <pre className="transformSqlModalContent"><code>{selectedModal.row.sql_code || "ไม่พบ SQL file"}</code></pre>
              ) : (
                <code className="transformSchemaModalContent">
                  {selectedModal.row.schema.split(",").join("\n")}
                </code>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
