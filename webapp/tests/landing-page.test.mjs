import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fitFeaturesToSvg } from "../lib/geo-svg.mjs";

const pageSource = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
const mapSource = readFileSync(new URL("../components/landing-district-map.jsx", import.meta.url), "utf8");

test("root keeps the standard shell and links each topic card to its module", () => {
  assert.doesNotMatch(pageSource, /redirect\(/);
  assert.match(pageSource, /<ModuleHeader \/>/);
  assert.match(pageSource, /className="main dashboardMain"/);
  assert.match(pageSource, /className="panel panelWide dashboardPanel landingPanel"/);
  for (const [href, title] of [
    ["/import-check/index", "ปริมาณข้อมูล"],
    ["/quality", "คุณภาพข้อมูล"],
    ["/gis", "GIS"],
  ]) {
    assert.match(pageSource, new RegExp(`href: "${href}",\\s*icon: \\w+,\\s*title: "${title}"`));
  }
  assert.equal([...pageSource.matchAll(/href: "/g)].length, 3);
  assert.doesNotMatch(pageSource, /target-group|report\/index/);
  assert.match(pageSource, /<Link className="landingCard" href=\{href\}/);
  assert.doesNotMatch(pageSource, /number:|"0[1-3]"/);
  assert.doesNotMatch(pageSource, /ai\.png|<img/);
  assert.equal(existsSync(new URL("../public/ai.png", import.meta.url)), false);
  assert.match(pageSource, /<LandingDistrictMap \/>/);
});

test("district map reads the public boundary endpoint and hides itself on failure", () => {
  assert.match(mapSource, /fetch\("\/api\/gis\/subdistrict-boundary"/);
  assert.match(mapSource, /if \(failed\) return null;/);
  assert.match(mapSource, /role="img"/);
  assert.match(mapSource, /aria-label=/);
  assert.match(mapSource, /landingMapPlaceholder/);
  assert.doesNotMatch(mapSource, /leaflet/);
});

function numbersOf(d) {
  return [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
}

test("fitFeaturesToSvg fits bounds into the viewBox and keeps the aspect ratio", () => {
  // 0.2° lon x 0.1° lat box at lat ~60°, where cos(lat) = 0.5 makes it square on screen.
  const feature = {
    properties: { name_th: "ก" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [[[[100, 59.95], [100.2, 59.95], [100.2, 60.05], [100, 60.05], [100, 59.95]]]],
    },
  };
  const [shape] = fitFeaturesToSvg([feature], { width: 400, height: 200, padding: 10 });
  assert.equal(shape.properties.name_th, "ก");
  assert.doesNotMatch(shape.d, /NaN/);

  const nums = numbersOf(shape.d);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  assert.ok(Math.abs(w - h) <= 1, `square stays square (${w} x ${h})`);
  assert.ok(Math.abs(h - 180) <= 1, "limited by height minus padding");
  assert.ok(Math.abs(Math.min(...xs) - 110) <= 1 && Math.abs(Math.max(...xs) - 290) <= 1, "centred horizontally");
  assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= 200);
  // north is up: the 60.05 edge maps to the smaller y
  assert.ok(nums[1] > nums[5]);
});

test("fitFeaturesToSvg ignores features without polygon geometry", () => {
  assert.deepEqual(fitFeaturesToSvg([]), []);
  assert.deepEqual(fitFeaturesToSvg([{ properties: {}, geometry: { type: "Point", coordinates: [1, 2] } }]), []);
});
