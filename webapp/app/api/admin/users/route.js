import { requireAdminApi } from "@/lib/admin-auth";
import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

function userPayload(row) {
  return {
    id: Number(row.id),
    provider_id: row.provider_id,
    fullname: row.fullname || "",
    hoscode: row.hoscode || "",
    hospname: row.hospname || "",
    role_id: Number(row.role_id),
    role: row.role_name || "user",
    role_note: row.role_note || "",
    login_count: Number(row.login_count || 0),
    last_activity: row.last_activity,
    is_active: Number(row.is_active) === 1,
    note: row.note || "",
  };
}

async function getRoles(connection) {
  const [rows] = await connection.query(
    "SELECT id, role FROM c_user_role WHERE is_active = 1 ORDER BY role",
  );
  return rows.map((row) => ({ id: Number(row.id), role: String(row.role) }));
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;
  let connection;
  try {
    connection = await createDbConnection();
    const [rows] = await connection.query(
      `SELECT u.id, u.provider_id, u.fullname, u.hoscode, h.hospname, u.role AS role_id,
              r.role AS role_name, r.note AS role_note, u.login_count, u.last_activity, u.is_active, u.note
       FROM c_user_provider u
       LEFT JOIN c_user_role r ON r.id = u.role
       LEFT JOIN c_hospital h ON h.hospcode = u.hoscode
       ORDER BY u.last_activity IS NULL, u.last_activity DESC, u.id DESC`,
    );
    return Response.json({ users: rows.map(userPayload), roles: await getRoles(connection) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function PATCH(request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;
  let connection;
  try {
    const body = await request.json();
    const id = Number(body?.id);
    const roleId = Number(body?.role_id);
    const isActive = body?.is_active === true || body?.is_active === 1;
    const note = String(body?.note ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }
    if (!Number.isInteger(roleId) || roleId <= 0 || note.length > 1000) {
      return Response.json({ error: "Invalid role or note" }, { status: 400 });
    }

    connection = await createDbConnection();
    const [roleRows] = await connection.query(
      "SELECT id, role FROM c_user_role WHERE id = ? AND is_active = 1 LIMIT 1",
      [roleId],
    );
    if (!roleRows.length) {
      return Response.json({ error: "Role is not active" }, { status: 400 });
    }
    const [currentRows] = await connection.query(
      "SELECT provider_id FROM c_user_provider WHERE id = ? LIMIT 1",
      [id],
    );
    if (!currentRows.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    if (admin.session.user.providerId === currentRows[0].provider_id && (!isActive || roleId !== 1)) {
      return Response.json({ error: "You cannot disable or demote your own account" }, { status: 400 });
    }
    await connection.query(
      "UPDATE c_user_provider SET role = ?, is_active = ?, note = ? WHERE id = ?",
      [roleId, isActive ? 1 : 0, note || null, id],
    );
    const [rows] = await connection.query(
      `SELECT u.id, u.provider_id, u.fullname, u.hoscode, h.hospname, u.role AS role_id,
              r.role AS role_name, r.note AS role_note, u.login_count, u.last_activity, u.is_active, u.note
       FROM c_user_provider u
       LEFT JOIN c_user_role r ON r.id = u.role
       LEFT JOIN c_hospital h ON h.hospcode = u.hoscode
       WHERE u.id = ?`,
      [id],
    );
    return Response.json({ user: userPayload(rows[0]) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function DELETE(request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;
  let connection;
  try {
    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    connection = await createDbConnection();
    const [rows] = await connection.query(
      "SELECT provider_id FROM c_user_provider WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    if (admin.session.user.providerId === rows[0].provider_id) {
      return Response.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    await connection.query("DELETE FROM c_user_provider WHERE id = ?", [id]);
    return Response.json({ deletedId: id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
