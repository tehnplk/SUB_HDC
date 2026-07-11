import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const uploadPage = readFileSync(new URL("../app/upload/page.js", import.meta.url), "utf8");
const personPage = readFileSync(new URL("../app/person/page.js", import.meta.url), "utf8");

test("application modules share one bounded content shell", () => {
  assert.match(css, /--app-content-width: 1440px/);
  assert.match(css, /\.panelWide \{[\s\S]*?width: min\(var\(--app-content-width\), 100%\)/);
  assert.match(css, /\.uploadPanel \{[\s\S]*?width: min\(var\(--app-content-width\), 100%\)/);
  assert.doesNotMatch(css, /\.standardPanel \{\s*max-width: 1180px/);
});

test("upload and person modules use the shared wide dashboard shell", () => {
  assert.match(uploadPage, /className="panel panelWide uploadPanel"/);
  assert.match(personPage, /className="main dashboardMain"/);
  assert.match(personPage, /className="panel panelWide dashboardPanel"/);
});
