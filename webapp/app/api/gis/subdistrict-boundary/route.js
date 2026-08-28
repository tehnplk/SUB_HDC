import { districtBoundaryCode, queryGis } from "@/lib/postgis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ขอบเขตตำบลของอำเภอที่ตั้งไว้ใน .env AMP_CODE — ตอบเป็น GeoJSON FeatureCollection
// ให้ leaflet ใช้ตรง ๆ
export async function GET() {
  const districtCode = districtBoundaryCode();
  if (!districtCode) {
    return Response.json({ error: "AMP_CODE is not configured" }, { status: 500 });
  }

  try {
    const { rows } = await queryGis(
      `SELECT code, name_th, name_en, district_code, district_th, province_code,
              province_th, ST_AsGeoJSON(geom) AS geojson
         FROM subdistrict_boundary
        WHERE district_code = $1
        ORDER BY code`,
      [districtCode]
    );

    return Response.json({
      type: "FeatureCollection",
      districtCode,
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
