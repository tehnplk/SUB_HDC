import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createDbConnection } from "./db.js";

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

export function getProviderIdentity(profile) {
  const providerId = firstText(profile?.provider_id, profile?.account_id);
  const fullname =
    [profile?.title_th, profile?.firstname_th, profile?.lastname_th]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim())
      .join("") || firstText(profile?.name_th, profile?.name);
  const organizations = Array.isArray(profile?.organizations)
    ? profile.organizations
    : Array.isArray(profile?.organization)
      ? profile.organization
      : [];
  let hoscode = firstText(profile?.hcode);
  for (const item of organizations) {
    try {
      const organization = typeof item === "string" ? JSON.parse(item) : item;
      hoscode = firstText(organization?.hcode, hoscode);
      if (hoscode) break;
    } catch {
      // Ignore malformed organization entries from the upstream profile.
    }
  }
  const upstreamCidHash = firstText(profile?.hash_cid);
  const cid = firstText(profile?.cid, profile?.citizen_id);
  const cidHash = upstreamCidHash || (cid ? createHash("sha256").update(cid).digest("hex") : null);
  const avatarInitial = Array.from(firstText(profile?.firstname_th))[0] || "";
  return { providerId, fullname, hoscode: hoscode || null, cidHash, avatarInitial };
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_KEY;
  if (!secret) throw new Error("AUTH_SECRET is required for ProviderID authentication");
  return secret;
}

export function signProviderProfile(serializedProfile) {
  return createHmac("sha256", getAuthSecret()).update(serializedProfile).digest("hex");
}

export function verifyProviderProfile(serializedProfile, signature) {
  if (!serializedProfile || !signature) return false;
  const expected = signProviderProfile(serializedProfile);
  const actualBuffer = Buffer.from(String(signature), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function registerProviderUser(profile) {
  const identity = getProviderIdentity(profile);
  if (!identity.providerId) throw new Error("ProviderID profile is missing provider_id");
  const connection = await createDbConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT u.id, u.is_active, u.role AS role_id, r.role AS role_name
       FROM c_user_provider u
       LEFT JOIN c_user_role r ON r.id = u.role
       WHERE u.provider_id = ? ORDER BY u.id LIMIT 1`,
      [identity.providerId],
    );
    const serializedProfile = JSON.stringify(profile);
    if (rows.length > 0) {
      if (Number(rows[0].is_active) !== 1) return null;
      await connection.execute(
        `UPDATE c_user_provider
         SET cid_hash = ?, fullname = ?, hoscode = ?, login_count = login_count + 1, last_activity = NOW(), profile = ?
         WHERE id = ?`,
        [identity.cidHash, identity.fullname || null, identity.hoscode, serializedProfile, rows[0].id],
      );
      if (!rows[0].role_name) throw new Error("ProviderID user has no valid role");
      return { ...identity, roleId: Number(rows[0].role_id), role: rows[0].role_name };
    }
    const [defaultRoles] = await connection.execute(
      "SELECT id FROM c_user_role WHERE role = 'guest' AND is_active = 1 LIMIT 1",
    );
    if (!defaultRoles.length) throw new Error("The active guest role is missing");
    const [result] = await connection.execute(
      `INSERT INTO c_user_provider
        (provider_id, cid_hash, fullname, hoscode, role, login_count, last_activity, is_active, profile)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), 1, ?)`,
      [identity.providerId, identity.cidHash, identity.fullname || null, identity.hoscode, defaultRoles[0].id, serializedProfile],
    );
    return { ...identity, id: result.insertId, roleId: Number(defaultRoles[0].id), role: "guest" };
  } finally {
    await connection.end();
  }
}
