import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("root uses the standard page shell and presents the district data-center concepts", () => {
  assert.doesNotMatch(pageSource, /redirect\(/);
  assert.match(pageSource, /ModuleHeader/);
  assert.match(pageSource, /className="main dashboardMain"/);
  assert.match(pageSource, /className="panel panelWide dashboardPanel landingConceptPanel"/);
  assert.doesNotMatch(pageSource, /landing\.png/);
  assert.doesNotMatch(pageSource, /ระบบศูนย์ข้อมูลประจำอำเภอ/);
  assert.doesNotMatch(pageSource, /ข้อมูลที่พร้อมใช้ เพื่อพื้นที่ที่เดินหน้าได้ทันเวลา/);
  assert.doesNotMatch(pageSource, /ศูนย์กลางสำหรับตรวจสอบคุณภาพข้อมูล/);
  assert.doesNotMatch(pageSource, /\bDatabase\b/);
  assert.match(pageSource, /ตรวจสอบคุณภาพ/);
  assert.match(pageSource, /จัดทำทะเบียนเป้าหมาย/);
  assert.match(pageSource, /ติดตามส่วนขาด/);
  assert.match(pageSource, /สรุปผลงาน/);
  assert.match(pageSource, /src="\/ai\.png"/);
  assert.match(pageSource, /className="landingConceptVisual"/);
  assert.match(globalStyles, /\.landingConceptVisual\s*\{[\s\S]*?border: 1px solid rgba\(15, 63, 105, 0\.14\);/);
  assert.match(globalStyles, /\.landingConceptVisual img\s*\{[\s\S]*?max-width: 320px;/);
  assert.doesNotMatch(pageSource, /className="landingConceptHeader"/);
  assert.match(globalStyles, /\.landingConceptGrid\s*\{[\s\S]*?grid-template-columns: repeat\(2,/);
});
