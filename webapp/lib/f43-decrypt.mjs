import crypto from "node:crypto";

// คู่กับ encryptAes ใน lib/import_f43_shared.js — aes-256-gcm, payload เป็น hex
// ของ iv(12) + ciphertext + tag(16) และ key = sha256 ของ ENCRYPT_KEY
export function getAesKey() {
  const raw = process.env.ENCRYPT_KEY || "change_me";
  return crypto.createHash("sha256").update(raw).digest();
}

export function decryptAes(value, key) {
  if (!value) return "";
  let buffer;
  try {
    buffer = Buffer.from(String(value), "hex");
  } catch {
    return "";
  }
  // สั้นกว่านี้แปลว่าไม่ใช่ payload ที่เข้ารหัสไว้ (iv 12 + tag 16)
  if (buffer.length <= 28) return "";

  try {
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(buffer.length - 16);
    const data = buffer.subarray(12, buffer.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // ข้อมูลเก่าที่เข้ารหัสด้วยคีย์อื่น หรือค่าที่ไม่ได้เข้ารหัส
    return "";
  }
}
