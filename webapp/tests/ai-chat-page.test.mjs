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

test("markdown table separator accepts GFM short dashes like :--: so tables render as table view", () => {
  assert.match(pageSource, /function isTableSeparator/);
  // GFM allows a single dash per column; :--: (2 dashes) must be accepted
  assert.match(pageSource, /:\?-\+:\?/);
  assert.doesNotMatch(pageSource, /-\{3,\}/);
});

test("chat route caches the system prompt and runs tool calls in parallel", () => {
  const routeSource = readFileSync(new URL("../app/api/ai/chat/route.js", import.meta.url), "utf8");
  assert.match(routeSource, /promptCache\.mtimeMs === mtimeMs/);
  assert.match(routeSource, /Promise\.all\(\s*completionRound\.toolCalls\.map/);
});

test("chat streams server-sent events and the page renders them live", () => {
  const routeSource = readFileSync(new URL("../app/api/ai/chat/route.js", import.meta.url), "utf8");
  assert.match(routeSource, /text\/event-stream/);
  assert.match(routeSource, /stream: true/);
  assert.match(routeSource, /stream_options: \{ include_usage: true \}/);
  assert.match(routeSource, /type: "delta"/);
  assert.match(routeSource, /type: "tool"/);
  assert.match(routeSource, /type: "done"/);

  assert.match(pageSource, /response\.body\.getReader\(\)/);
  assert.match(pageSource, /event\.type === "delta"/);
  assert.match(pageSource, /event\.type === "done"/);
  assert.match(pageSource, /streaming: true/);
});

test("chat route never sends the export downloadUrl back to the model", () => {
  const routeSource = readFileSync(new URL("../app/api/ai/chat/route.js", import.meta.url), "utf8");
  assert.match(routeSource, /function sanitizeToolResultForModel/);
  assert.match(routeSource, /const \{ downloadUrl, \.\.\.safe \} = result/);
  assert.match(routeSource, /toolResultMessage\(toolCall, sanitizeToolResultForModel\(result\)\)/);
  assert.doesNotMatch(routeSource, /toolResultMessage\(toolCall, result\)/);
});
