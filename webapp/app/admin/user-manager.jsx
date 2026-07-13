"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CheckCircle2, PencilLine, Search, ShieldCheck, Trash2, UserRoundCheck, UserRoundX, UsersRound, X } from "lucide-react";
import ModuleHeader from "@/components/module-header";

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load users");
        setUsers(payload.users || []);
        setRoles(payload.roles || []);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesName = !term || String(user.fullname || "").toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? user.is_active : !user.is_active);
      return matchesName && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const activeCount = users.filter((user) => user.is_active).length;
  const adminCount = users.filter((user) => user.role === "admin" && user.is_active).length;

  function openEditor(user) {
    setEditing({ ...user, saving: false, error: "" });
  }

  async function saveUser(event) {
    event.preventDefault();
    setEditing((current) => ({ ...current, saving: true, error: "" }));
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          role_id: editing.role_id,
          is_active: editing.is_active,
          note: editing.note,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to save user");
      setUsers((current) => current.map((user) => user.id === payload.user.id ? payload.user : user));
      setEditing(null);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "User updated",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (saveError) {
      setEditing((current) => ({ ...current, saving: false, error: saveError.message }));
    }
  }

  async function deleteUser(user) {
    const confirmation = await Swal.fire({
      title: "Permanently delete user?",
      text: `${user.fullname || "Unnamed user"} and their saved ProviderID profile will be deleted permanently.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete permanently",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    const payload = await response.json();
    if (!response.ok) {
      await Swal.fire({ icon: "error", title: "Cannot delete user", text: payload.error || "Delete failed" });
      return;
    }
    setUsers((current) => current.filter((item) => item.id !== payload.deletedId));
    await Swal.fire({ toast: true, position: "top-end", icon: "success", title: "User deleted", showConfirmButton: false, timer: 1800 });
  }

  return (
    <div className="main dashboardMain adminUsersMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader />

        {error ? <div className="error">{error}</div> : null}

        <div className="adminUserStats" aria-label="User summary">
          <article><UsersRound /><strong>{users.length}</strong><span>Total users</span></article>
          <article><UserRoundCheck /><strong>{activeCount}</strong><span>Active</span></article>
          <article><ShieldCheck /><strong>{adminCount}</strong><span>Administrators</span></article>
        </div>

        <div className="adminUsersToolbar">
          <div className="adminFilterControls" aria-label="User filters">
            <div className="inputWithIcon adminSearchField">
              <Search aria-hidden="true" />
              <input
                className="fieldInput adminSearchInput"
                aria-label="Search users"
                placeholder="Search user name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select className="adminFilterSelect" aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All roles</option>
              {roles.map((role) => <option key={role.id} value={role.role}>{role.role}</option>)}
            </select>
            <select className="adminFilterSelect" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <span aria-live="polite">{loading ? "Loading…" : `${filteredUsers.length} of ${users.length} users`}</span>
        </div>

        <div className="tableWrap">
          <table className="fileTable adminUsersTable">
            <thead><tr><th>ID</th><th>USER</th><th>HOSPCODE</th><th>ROLE</th><th>STATUS</th><th>LOGIN (ครั้ง)</th><th>LAST ACTIVITY</th><th>ACTION</th></tr></thead>
            <tbody>
              {filteredUsers.length ? filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td><strong>{user.fullname || "Unnamed user"}</strong>{user.note ? <small>{user.note}</small> : null}</td>
                  <td className="adminTwoLine"><strong>{user.hoscode || "-"}</strong>{user.hospname ? <small>{user.hospname}</small> : null}</td>
                  <td className="adminTwoLine"><span className={`adminRoleBadge adminRole-${user.role}`}>{user.role}</span>{user.role_note ? <small>{user.role_note}</small> : null}</td>
                  <td><span className={`adminStatusBadge ${user.is_active ? "adminStatusActive" : "adminStatusInactive"}`}>{user.is_active ? <CheckCircle2 /> : <UserRoundX />}{user.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="adminLoginCount">{user.login_count}</td>
                  <td>{formatDate(user.last_activity)}</td>
                  <td className="adminUserActions"><button type="button" className="adminActionButton adminEditButton" onClick={() => openEditor(user)}><PencilLine />Edit</button><button type="button" className="adminActionButton adminDeleteButton" onClick={() => deleteUser(user)}><Trash2 />Delete</button></td>
                </tr>
              )) : <tr><td className="emptyCell" colSpan={8}>{loading ? "Loading users…" : "No users found"}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="reportModalBackdrop" role="presentation" onClick={() => setEditing(null)}>
          <section className="reportModal adminUserModal" role="dialog" aria-modal="true" aria-labelledby="admin-user-title" onClick={(event) => event.stopPropagation()}>
            <div className="reportModalHeader">
              <div><p className="eyebrow">User account</p><h2 id="admin-user-title">{editing.fullname || "Unnamed user"}</h2></div>
              <button type="button" className="reportModalClose" onClick={() => setEditing(null)} aria-label="Close"><X /></button>
            </div>
            {editing.error ? <div className="error">{editing.error}</div> : null}
            <form className="adminUserForm" onSubmit={saveUser}>
              <label><span>Role</span><select value={editing.role_id} onChange={(event) => setEditing((current) => ({ ...current, role_id: Number(event.target.value) }))}>{roles.map((role) => <option key={role.id} value={role.id}>{role.role}</option>)}</select></label>
              <label className="adminActiveToggle"><input type="checkbox" checked={editing.is_active} onChange={(event) => setEditing((current) => ({ ...current, is_active: event.target.checked }))} /><span>Account active</span></label>
              <label><span>Note</span><textarea rows={4} maxLength={1000} value={editing.note} onChange={(event) => setEditing((current) => ({ ...current, note: event.target.value }))} placeholder="Internal administrative note" /></label>
              <div className="reportModalActions"><div className="reportModalPrimaryActions"><button type="button" className="secondary" onClick={() => setEditing(null)} disabled={editing.saving}>Cancel</button><button type="submit" className="reportExportButton" disabled={editing.saving}>{editing.saving ? "Saving…" : "Save changes"}</button></div></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
