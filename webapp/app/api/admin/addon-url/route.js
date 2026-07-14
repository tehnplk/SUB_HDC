import { requireAdminApi } from "@/lib/admin-auth";
import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

function addonPayload(row) {
  return {
    id: Number(row.id),
    url: row.url || "",
    system_name: row.system_name || "",
    is_active: Number(row.is_active) === 1,
    note: row.note || "",
  };
}

function validateFields(body) {
  const url = String(body?.url ?? "").trim();
  const systemName = String(body?.system_name ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const isActive = body?.is_active === true || body?.is_active === 1;
  if (!url || url.length > 500) return { error: "URL is required (max 500 chars)" };
  if (!systemName || systemName.length > 255) return { error: "System name is required (max 255 chars)" };
  if (note.length > 65535) return { error: "Note is too long" };
  return { url, systemName, note, isActive };
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;
  let connection;
  try {
    connection = await createDbConnection();
    const [rows] = await connection.query(
      "SELECT id, url, system_name, is_active, note FROM c_addon_url ORDER BY id",
    );
    return Response.json({ addons: rows.map(addonPayload) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function POST(request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;
  let connection;
  try {
    const fields = validateFields(await request.json());
    if (fields.error) return Response.json({ error: fields.error }, { status: 400 });

    connection = await createDbConnection();
    const [result] = await connection.query(
      "INSERT INTO c_addon_url (url, system_name, is_active, note) VALUES (?, ?, ?, ?)",
      [fields.url, fields.systemName, fields.isActive ? 1 : 0, fields.note || null],
    );
    const [rows] = await connection.query(
      "SELECT id, url, system_name, is_active, note FROM c_addon_url WHERE id = ?",
      [result.insertId],
    );
    return Response.json({ addon: addonPayload(rows[0]) }, { status: 201 });
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
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Invalid addon id" }, { status: 400 });
    }
    const fields = validateFields(body);
    if (fields.error) return Response.json({ error: fields.error }, { status: 400 });

    connection = await createDbConnection();
    const [current] = await connection.query(
      "SELECT id FROM c_addon_url WHERE id = ? LIMIT 1",
      [id],
    );
    if (!current.length) {
      return Response.json({ error: "Add-on not found" }, { status: 404 });
    }
    await connection.query(
      "UPDATE c_addon_url SET url = ?, system_name = ?, is_active = ?, note = ? WHERE id = ?",
      [fields.url, fields.systemName, fields.isActive ? 1 : 0, fields.note || null, id],
    );
    const [rows] = await connection.query(
      "SELECT id, url, system_name, is_active, note FROM c_addon_url WHERE id = ?",
      [id],
    );
    return Response.json({ addon: addonPayload(rows[0]) });
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
      return Response.json({ error: "Invalid addon id" }, { status: 400 });
    }
    connection = await createDbConnection();
    const [rows] = await connection.query(
      "SELECT id FROM c_addon_url WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows.length) {
      return Response.json({ error: "Add-on not found" }, { status: 404 });
    }
    await connection.query("DELETE FROM c_addon_url WHERE id = ?", [id]);
    return Response.json({ deletedId: id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
