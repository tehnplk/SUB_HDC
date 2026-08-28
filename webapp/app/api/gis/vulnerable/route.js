import { requireGisAuth } from "@/lib/gis-auth.mjs";
import { queryGis } from "@/lib/postgis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ทะเบียนกลุ่มเปราะบางรายคนที่มีพิกัด — ตอบเป็น GeoJSON FeatureCollection
// ไม่ส่ง cid ออกไปหน้าเว็บ (ข้อมูลระบุตัวบุคคล)
export async function GET(request) {
  // กรองตามประเภทกลุ่มเปราะบาง (c_vulnerable.id) — panel ยิงมาทีละกลุ่ม
  const raw = new URL(request.url).searchParams.get("vulnerable");
  const vulnerable = raw === null || raw === "" ? null : Number(raw);
  if (vulnerable !== null && !Number.isInteger(vulnerable)) {
    return Response.json({ error: "vulnerable must be an integer" }, { status: 400 });
  }

  try {
    const { rows } = await queryGis(
      // to_char กัน pg แปลง date เป็น JS Date ตาม timezone ของ process แล้ววันเพี้ยน
      // LEFT JOIN ไม่กรอง is_active — รหัสที่เลิกใช้แล้วต้องยังขึ้นบนแผนที่ ไม่ใช่หายไป
      `SELECT v.hospcode, v.pid, v.fullname, v.sex,
              to_char(v.birth, 'YYYY-MM-DD') AS birth,
              v.vulnerable, c.name AS vulnerable_name,
              v.addr_no, v.road, v.village_code, v.village_name,
              -- village_code 8 หลัก = จังหวัด2 อำเภอ2 ตำบล2 หมู่2; 6 หลักแรกตรงกับ
              -- subdistrict_boundary.code ที่ขึ้นต้นด้วย TH จึง join หาชื่อพื้นที่ได้
              NULLIF(ltrim(right(v.village_code, 2), '0'), '') AS moo,
              sb.name_th AS tambon_name, sb.district_th AS district_name,
              sb.province_th AS province_name,
              ST_AsGeoJSON(v.geo_point) AS geojson
         FROM vulnerable v
         LEFT JOIN c_vulnerable c ON c.id = v.vulnerable
         LEFT JOIN subdistrict_boundary sb
                ON sb.code = 'TH' || left(v.village_code, 6)
        WHERE v.geo_point IS NOT NULL
          AND ($1::smallint IS NULL OR v.vulnerable = $1::smallint)
        ORDER BY v.hospcode, v.pid`,
      [vulnerable]
    );

    return Response.json({
      type: "FeatureCollection",
      features: rows.map(({ geojson, ...properties }) => ({
        type: "Feature",
        properties,
        geometry: JSON.parse(geojson),
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// เพิ่มหมุดรายคนจาก toolbox บนแผนที่ — เขียนข้อมูล ต้อง login ก่อน
// (GET เปิดสาธารณะเหมือนตัวแผนที่ ป้องกันเฉพาะฝั่งเขียน)
export async function POST(request) {
  const unauthorized = await requireGisAuth();
  if (unauthorized) return unauthorized;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  const trim = (value) => (typeof value === "string" ? value.trim() : "");
  const hospcode = trim(body?.hospcode);
  const pid = trim(body?.pid);
  const cid = trim(body?.cid);
  const fullname = trim(body?.fullname);
  const sex = trim(body?.sex);
  const birth = trim(body?.birth);
  const vulnerable = Number(body?.vulnerable);
  const addrNo = trim(body?.addr_no);
  const road = trim(body?.road);
  const villageCode = trim(body?.village_code);
  const villageName = trim(body?.village_name);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);

  if (!hospcode || !pid) {
    return Response.json({ error: "ต้องระบุรหัสหน่วยบริการและ PID" }, { status: 400 });
  }
  if (!Number.isInteger(vulnerable)) {
    return Response.json({ error: "ต้องเลือกกลุ่มเปราะบาง" }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "พิกัดไม่ถูกต้อง" }, { status: 400 });
  }
  if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    return Response.json({ error: "วันเกิดต้องเป็นรูปแบบ YYYY-MM-DD" }, { status: 400 });
  }
  if (villageCode && !/^\d{8}$/.test(villageCode)) {
    return Response.json({ error: "รหัสหมู่บ้านต้องเป็นตัวเลข 8 หลัก" }, { status: 400 });
  }

  try {
    // upsert ด้วย PK (hospcode, pid) — แก้พิกัด/ข้อมูลของคนเดิมได้โดยไม่ต้องลบก่อน
    await queryGis(
      `INSERT INTO vulnerable (hospcode, pid, cid, fullname, sex, birth, vulnerable,
                               addr_no, road, village_code, village_name, geo_point)
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, '')::date, $7,
               NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''),
               ST_SetSRID(ST_MakePoint($12, $13), 4326))
       ON CONFLICT (hospcode, pid) DO UPDATE SET
         cid = EXCLUDED.cid, fullname = EXCLUDED.fullname, sex = EXCLUDED.sex,
         birth = EXCLUDED.birth, vulnerable = EXCLUDED.vulnerable,
         addr_no = EXCLUDED.addr_no, road = EXCLUDED.road,
         village_code = EXCLUDED.village_code, village_name = EXCLUDED.village_name,
         geo_point = EXCLUDED.geo_point`,
      [hospcode, pid, cid, fullname, sex, birth, vulnerable,
       addrNo, road, villageCode, villageName, lng, lat]
    );
    return Response.json({ saved: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
