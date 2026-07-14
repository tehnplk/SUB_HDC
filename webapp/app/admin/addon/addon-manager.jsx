"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CheckCircle2, LayoutGrid, PencilLine, Plus, Search, Trash2, UserRoundX, X } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const EMPTY_FORM = { id: null, url: "", system_name: "", is_active: true, note: "" };

export default function AdminAddonManager() {
  const [addons, setAddons] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetch("/api/admin/addon-url", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load add-ons");
        setAddons(payload.addons || []);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return addons;
    return addons.filter((addon) =>
      String(addon.system_name || "").toLowerCase().includes(term)
      || String(addon.url || "").toLowerCase().includes(term),
    );
  }, [query, addons]);

  const activeCount = addons.filter((addon) => addon.is_active).length;

  function openCreate() {
    setEditing({ ...EMPTY_FORM, saving: false, error: "" });
  }

  function openEditor(addon) {
    setEditing({ ...addon, saving: false, error: "" });
  }

  async function saveAddon(event) {
    event.preventDefault();
    setEditing((current) => ({ ...current, saving: true, error: "" }));
    const isNew = !editing.id;
    try {
      const response = await fetch("/api/admin/addon-url", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          url: editing.url,
          system_name: editing.system_name,
          is_active: editing.is_active,
          note: editing.note,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to save add-on");
      setAddons((current) => isNew
        ? [...current, payload.addon]
        : current.map((addon) => addon.id === payload.addon.id ? payload.addon : addon));
      setEditing(null);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: isNew ? "เพิ่มระบบเสริมแล้ว" : "บันทึกแล้ว", showConfirmButton: false, timer: 1800 });
    } catch (saveError) {
      setEditing((current) => ({ ...current, saving: false, error: saveError.message }));
    }
  }

  async function deleteAddon(addon) {
    const confirmation = await Swal.fire({
      title: "ลบระบบเสริมนี้?",
      text: `${addon.system_name || "ไม่มีชื่อ"} จะถูกลบถาวร`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบถาวร",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;

    const response = await fetch("/api/admin/addon-url", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: addon.id }),
    });
    const payload = await response.json();
    if (!response.ok) {
      await Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: payload.error || "Delete failed" });
      return;
    }
    setAddons((current) => current.filter((item) => item.id !== payload.deletedId));
    await Swal.fire({ toast: true, position: "top-end", icon: "success", title: "ลบแล้ว", showConfirmButton: false, timer: 1800 });
  }

  return (
    <div className="main dashboardMain adminUsersMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader />

        {error ? <div className="error">{error}</div> : null}

        <div className="adminUserStats" aria-label="สรุประบบเสริม">
          <article><LayoutGrid /><strong>{addons.length}</strong><span>ทั้งหมด</span></article>
          <article><CheckCircle2 /><strong>{activeCount}</strong><span>เปิดใช้งาน</span></article>
        </div>

        <div className="adminUsersToolbar">
          <div className="adminFilterControls" aria-label="ตัวกรองระบบเสริม">
            <div className="inputWithIcon adminSearchField">
              <Search aria-hidden="true" />
              <input
                className="fieldInput adminSearchInput"
                aria-label="ค้นหาระบบเสริม"
                placeholder="ค้นหาชื่อระบบ หรือ URL"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button type="button" className="reportExportButton adminAddonAddButton" onClick={openCreate}>
              <Plus aria-hidden="true" />เพิ่มระบบเสริม
            </button>
          </div>
          <span aria-live="polite">{loading ? "กำลังโหลด…" : `${filtered.length} จาก ${addons.length} รายการ`}</span>
        </div>

        <div className="tableWrap">
          <table className="fileTable adminUsersTable">
            <thead><tr><th>ID</th><th>ชื่อระบบ</th><th>URL</th><th>สถานะ</th><th>หมายเหตุ</th><th>ACTION</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((addon) => (
                <tr key={addon.id}>
                  <td>{addon.id}</td>
                  <td><strong>{addon.system_name || "ไม่มีชื่อ"}</strong></td>
                  <td><a href={addon.url} target="_blank" rel="noopener noreferrer" className="exportXlsxLink">{addon.url}</a></td>
                  <td><span className={`adminStatusBadge ${addon.is_active ? "adminStatusActive" : "adminStatusInactive"}`}>{addon.is_active ? <CheckCircle2 /> : <UserRoundX />}{addon.is_active ? "เปิด" : "ปิด"}</span></td>
                  <td>{addon.note || "-"}</td>
                  <td className="adminUserActions"><button type="button" className="adminActionButton adminEditButton" onClick={() => openEditor(addon)}><PencilLine />แก้ไข</button><button type="button" className="adminActionButton adminDeleteButton" onClick={() => deleteAddon(addon)}><Trash2 />ลบ</button></td>
                </tr>
              )) : <tr><td className="emptyCell" colSpan={6}>{loading ? "กำลังโหลด…" : "ยังไม่มีระบบเสริม"}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="reportModalBackdrop" role="presentation" onClick={() => setEditing(null)}>
          <section className="reportModal adminUserModal" role="dialog" aria-modal="true" aria-labelledby="admin-addon-title" onClick={(event) => event.stopPropagation()}>
            <div className="reportModalHeader">
              <div><p className="eyebrow">ระบบเสริม</p><h2 id="admin-addon-title">{editing.id ? (editing.system_name || "แก้ไขระบบเสริม") : "เพิ่มระบบเสริม"}</h2></div>
              <button type="button" className="reportModalClose" onClick={() => setEditing(null)} aria-label="ปิด"><X /></button>
            </div>
            {editing.error ? <div className="error">{editing.error}</div> : null}
            <form className="adminUserForm" onSubmit={saveAddon}>
              <label><span>ชื่อระบบ</span><input type="text" maxLength={255} required value={editing.system_name} onChange={(event) => setEditing((current) => ({ ...current, system_name: event.target.value }))} placeholder="เช่น Dashboard ตรวจสอบ" /></label>
              <label><span>URL</span><input type="url" maxLength={500} required value={editing.url} onChange={(event) => setEditing((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." /></label>
              <label className="adminActiveToggle"><input type="checkbox" checked={editing.is_active} onChange={(event) => setEditing((current) => ({ ...current, is_active: event.target.checked }))} /><span>เปิดใช้งาน</span></label>
              <label><span>หมายเหตุ</span><textarea rows={3} value={editing.note} onChange={(event) => setEditing((current) => ({ ...current, note: event.target.value }))} placeholder="หมายเหตุภายใน" /></label>
              <div className="reportModalActions"><div className="reportModalPrimaryActions"><button type="button" className="secondary" onClick={() => setEditing(null)} disabled={editing.saving}>ยกเลิก</button><button type="submit" className="reportExportButton" disabled={editing.saving}>{editing.saving ? "กำลังบันทึก…" : "บันทึก"}</button></div></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
