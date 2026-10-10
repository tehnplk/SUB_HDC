// Project GeoJSON (Multi)Polygon features into SVG path data that fits a
// width x height viewBox. Equirectangular with longitude scaled by cos(mean
// latitude), one uniform scale so the shape keeps its aspect ratio, centred.
// ponytail: fine for a district-sized area; use a real projection for country scale.

function polygonsOf(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

export function fitFeaturesToSvg(features, { width = 400, height = 400, padding = 8 } = {}) {
  const shapes = (features || []).map((feature) => ({
    properties: feature?.properties || {},
    polygons: polygonsOf(feature?.geometry),
  })).filter((shape) => shape.polygons.length);

  const points = shapes.flatMap((shape) => shape.polygons.flat(2));
  if (!points.length) return [];

  // Loops, not Math.min(...arr): boundary rings can exceed the spread-argument limit.
  let minLon = Infinity, maxLon = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }
  const kx = Math.cos(((minY + maxY) / 2) * (Math.PI / 180));
  const minX = minLon * kx;
  const maxX = maxLon * kx;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  const project = ([lon, lat]) => [
    +(offsetX + (lon * kx - minX) * scale).toFixed(1),
    +(offsetY + (maxY - lat) * scale).toFixed(1),
  ];

  return shapes.map(({ properties, polygons }) => ({
    properties,
    d: polygons
      .flatMap((rings) => rings.map((ring) => `M${ring.map((p) => project(p).join(",")).join("L")}Z`))
      .join(""),
  }));
}
