import { requireGisAuth } from "@/lib/gis-auth.mjs";
import { getPooledDbConnection } from "@/lib/db";
import { decryptAes, getAesKey } from "@/lib/f43-decrypt.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ค้นได้กว้างแค่ไหนก่อนถอดรหัส — person.lname เข้ารหัสไว้ กรองใน SQL ไม่ได้
// จึงดึงตามชื่อต้นก่อนแล้วค่อยกรองนามสกุลใน node
const SCAN_LIMIT = 300;
const RESULT_LIMIT = 20;

// person.birth เก็บเป็น YYYYMMDD
function toIsoDate(birth) {
  const digits = String(birth ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// แฟ้ม HOME ใส่ "-" หรือ "0" แทนค่าว่างบ่อย — ไม่ต้องเอามาโชว์ในฟอร์ม
function cleanText(value) {
  const text = String(value ?? "").trim();
  return text === "-" || text === "0" ? "" : text;
}

function pad2(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.padStart(2, "0").slice(-2) : "";
}

// รหัสหมู่บ้าน 8 หลัก = จังหวัด2 อำเภอ2 ตำบล2 หมู่2
function villageCode({ changwat, ampur, tambon, village }) {
  const parts = [pad2(changwat), pad2(ampur), pad2(tambon), pad2(village)];
  return parts.every(Boolean) ? parts.join("") : "";
}

export async function GET(request) {
  const unauthorized = await requireGisAuth();
  if (unauthorized) return unauthorized;

  const query = (new URL(request.url).searchParams.get("q") || "").trim();
  if (query.length < 2) return Response.json({ items: [] });

  const [firstName, ...rest] = query.split(/\s+/);
  const lastNameTerm = rest.join(" ");

  let conn;
  try {
    conn = await getPooledDbConnection();
    const [rows] = await conn.query(
      `SELECT p.hospcode, p.pid, p.cid_aes, p.name, p.lname, p.sex, p.birth,
              h.house, h.road, h.villaname, h.village, h.tambon, h.ampur, h.changwat
         FROM person p
         LEFT JOIN home h ON h.hospcode = p.hospcode AND h.hid = p.hid
        WHERE p.name LIKE ?
          -- เฉพาะประชากรในเขตรับผิดชอบ (typearea 1,3) ที่ยังไม่จำหน่าย (discharge 9)
          AND p.typearea IN ('1', '3')
          AND p.discharge = '9'
        ORDER BY p.name, p.hospcode, p.pid
        LIMIT ?`,
      [`${firstName}%`, SCAN_LIMIT]
    );

    const key = getAesKey();
    const items = [];
    for (const row of rows) {
      const lname = decryptAes(row.lname, key);
      if (lastNameTerm && !lname.startsWith(lastNameTerm)) continue;

      items.push({
        hospcode: row.hospcode,
        pid: row.pid,
        cid: decryptAes(row.cid_aes, key),
        fullname: [row.name, lname].filter(Boolean).join(" "),
        sex: row.sex,
        birth: toIsoDate(row.birth),
        addr_no: cleanText(decryptAes(row.house, key)),
        road: cleanText(row.road),
        village_code: villageCode(row),
        village_name: cleanText(row.villaname),
      });
      if (items.length >= RESULT_LIMIT) break;
    }

    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
