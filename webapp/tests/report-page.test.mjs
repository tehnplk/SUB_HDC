import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/dashboard/report/page.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("report grid keeps report name as data-view action and edit as admin update action", () => {
  assert.match(pageSource, /<th[^>]*>Action<\/th>/);
  assert.match(pageSource, /className="reportNameButton"/);
  assert.match(pageSource, /onClick=\{\(\) => openReport\(report\)\}/);
  assert.match(pageSource, /className="reportEditButton"/);
  assert.match(pageSource, /onClick=\{\(\) => openEditReport\(report\)\}/);
  assert.match(pageSource, />\s*Edit\s*</);
});

test("create report button is on the same row as the datagrid label", () => {
  assert.match(pageSource, /className="tableMeta metaLine reportGridHeader"/);
  assert.match(pageSource, /className="tableMeta metaLine reportGridHeader"[\s\S]*className="reportCreateButton primaryBlue"/);
  assert.doesNotMatch(pageSource, /className="reportToolbar"/);
});

test("create report icon inherits blue primary button text color", () => {
  assert.match(stylesSource, /\.reportCreateButton \.lucide\s*\{\s*color:\s*currentColor;/);
});

test("report edit modal submits report name and sql updates", () => {
  assert.match(pageSource, /editState/);
  assert.match(pageSource, /name="name"/);
  assert.match(pageSource, /name="sql"/);
  assert.match(pageSource, /method:\s*editState\.report\?\.id\s*\?\s*"PATCH"\s*:\s*"PUT"/);
  assert.match(pageSource, /body:\s*JSON\.stringify\(\{\s*id:\s*editState\.report\?\.id,\s*name:\s*editState\.name,\s*sql:\s*editState\.sql,\s*\}\)/s);
});

test("report edit modal shows toast after successful save", () => {
  assert.match(pageSource, /Swal\.fire\(\{\s*toast:\s*true,\s*position:\s*"top-end",\s*icon:\s*"success",\s*title:\s*"Save successful"/s);
  assert.match(pageSource, /showConfirmButton:\s*false/);
  assert.match(pageSource, /timer:\s*1800/);
});

test("report edit modal deletes an existing report after SweetAlert confirmation", () => {
  assert.match(pageSource, /import Swal from "sweetalert2"/);
  assert.match(pageSource, /async function deleteEditReport\(\)/);
  assert.match(pageSource, /Swal\.fire\(\{\s*title:\s*"Delete report\?"/s);
  assert.match(pageSource, /showCancelButton:\s*true/);
  assert.match(pageSource, /confirmButtonText:\s*"Delete"/);
  assert.match(pageSource, /if \(!result\.isConfirmed\) return;/);
  assert.match(pageSource, /method:\s*"DELETE"/);
  assert.match(pageSource, /className="reportDeleteButton"/);
});

test("edit modal action buttons share the same compact shape", () => {
  assert.match(stylesSource, /\.reportModalActions button\s*\{\s*min-height:\s*36px;\s*padding:\s*8px 14px;\s*border-radius:\s*var\(--radius-sm\);\s*font-size:\s*13px;/);
});

test("edit modal keeps cancel and save actions on the far right", () => {
  assert.match(pageSource, /<div className="reportModalPrimaryActions">[\s\S]*>\s*Cancel\s*<[\s\S]*>\s*\{editState\.saving \? "Saving\.\.\." : editState\.report\?\.id \? "Save" : "Create"\}\s*<[\s\S]*<\/div>/);
  assert.match(stylesSource, /\.reportModalPrimaryActions\s*\{\s*display:\s*flex;\s*align-items:\s*center;\s*gap:\s*8px;\s*margin-left:\s*auto;/);
});

test("report page has create report button that opens empty report form", () => {
  assert.match(pageSource, /className="reportCreateButton primaryBlue"/);
  assert.match(pageSource, /onClick=\{openCreateReport\}/);
  assert.match(pageSource, />\s*สร้างรายงาน\s*</);
  assert.match(pageSource, /function openCreateReport\(\)/);
  assert.match(pageSource, /report:\s*null,\s*name:\s*"",\s*sql:\s*""/s);
});
