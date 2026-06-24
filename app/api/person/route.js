import crypto from "node:crypto";
import { createDbConnection } from "../../../lib/db";

function getAesKey() {
  const raw = process.env.SECRET_KEY || "change_me";
  return crypto.createHash("sha256").update(raw).digest();
}

function decryptAes(hex, key) {
  if (!hex) return "";
  try {
    const buf = Buffer.from(hex, "hex");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const encrypted = buf.subarray(12, buf.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return hex;
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = (page - 1) * limit;

    const conn = await createDbConnection();

    const [[{ total }]] = await conn.query("SELECT COUNT(*) AS total FROM person");
    const [rows] = await conn.query("SELECT hospcode, pid, name, lname FROM person LIMIT ? OFFSET ?", [limit, offset]);
    await conn.end();

    const aesKey = getAesKey();
    const decrypted = rows.map((r) => ({
      ...r,
      lname: decryptAes(r.lname, aesKey),
    }));

    return Response.json({ total, page, limit, rows: decrypted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
