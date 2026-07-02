import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/ai/chat/page.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("AI chat opens DbQuery SQL in a selectable modal code panel", () => {
  assert.match(pageSource, /const \[activeToolDetail,\s*setActiveToolDetail\] = useState\(null\)/);
  assert.match(pageSource, /className="chatToolButton"/);
  assert.match(pageSource, /onClick=\{\(\) => setActiveToolDetail\(tool\)\}/);
  assert.match(pageSource, /className="chatToolModal"/);
  assert.match(pageSource, /role="dialog"/);
  assert.match(pageSource, /<code>\{activeToolDetail\.sql \|\| activeToolDetail\.error\}<\/code>/);
  assert.doesNotMatch(pageSource, /className="chatToolDetail"/);
  assert.match(stylesSource, /\.chatToolModalCode\s*\{[\s\S]*user-select:\s*text;/);
  assert.match(stylesSource, /\.chatToolModalCode code\s*\{[\s\S]*white-space:\s*pre-wrap;/);
});
