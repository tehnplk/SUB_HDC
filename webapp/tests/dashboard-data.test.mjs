import assert from "node:assert/strict";
import test from "node:test";

import {
  datePrefixExpression,
  chooseMonthlyDateColumn,
  chooseSelectedFile,
  getFileTypeLabel,
  getMonthlyRowTotal,
  getFiscalYearRange,
  getRecentFiscalYearOptions,
  toFiscalYearLabel,
} from "../lib/dashboard-data.mjs";

test("chooseMonthlyDateColumn prefers date_serv over date_admit", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "date_admit", "date_serv"]), "date_serv");
});

test("chooseMonthlyDateColumn falls back to date_admit", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "date_admit"]), "date_admit");
});

test("chooseMonthlyDateColumn falls back to datetime_admit", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "datetime_admit"]), "datetime_admit");
});

test("chooseMonthlyDateColumn falls back to datetime_serv", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "datetime_serv"]), "datetime_serv");
});

test("chooseMonthlyDateColumn falls back to bdate", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "bdate"]), "bdate");
});

test("chooseMonthlyDateColumn returns null when monthly date columns are missing", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "d_update"]), null);
});

test("datePrefixExpression reads the first 8 digits from datetime columns", () => {
  assert.equal(datePrefixExpression("datetime_admit"), "LEFT(`datetime_admit`, 8)");
  assert.equal(datePrefixExpression("datetime_serv"), "LEFT(`datetime_serv`, 8)");
});

test("datePrefixExpression uses plain 8-digit date columns directly (no LEFT, index-friendly)", () => {
  // date_serv/date_admit/bdate เป็น varchar(8) สะอาด — ตัด LEFT ออกให้ใช้ index ได้
  assert.equal(datePrefixExpression("date_serv"), "`date_serv`");
  assert.equal(datePrefixExpression("date_admit"), "`date_admit`");
  assert.equal(datePrefixExpression("bdate"), "`bdate`");
});

test("getFiscalYearRange supports Thai Buddhist fiscal year labels", () => {
  assert.deepEqual(getFiscalYearRange("2569"), {
    fiscalYearAd: 2026,
    start: "20251001",
    end: "20261001",
  });
});

test("toFiscalYearLabel displays fiscal year as Buddhist Era", () => {
  assert.equal(toFiscalYearLabel(2026), "2569");
});

test("getRecentFiscalYearOptions returns the current fiscal year and five years back", () => {
  assert.deepEqual(getRecentFiscalYearOptions(2026), [
    { value: "2569", label: "2569" },
    { value: "2568", label: "2568" },
    { value: "2567", label: "2567" },
    { value: "2566", label: "2566" },
    { value: "2565", label: "2565" },
    { value: "2564", label: "2564" },
  ]);
});

test("chooseSelectedFile defaults to service when no requested file is provided", () => {
  assert.equal(chooseSelectedFile(["accident", "service"], null), "service");
});

test("chooseSelectedFile keeps a valid requested file", () => {
  assert.equal(chooseSelectedFile(["accident", "service"], "accident"), "accident");
});

test("getMonthlyRowTotal sums only configured month keys", () => {
  assert.equal(
    getMonthlyRowTotal(
      [
        { key: "oct" },
        { key: "nov" },
        { key: "dec" },
      ],
      { oct: 4, nov: "5", dec: null, ignored: 100 }
    ),
    9
  );
});

test("getFileTypeLabel separates service and cumulative files", () => {
  assert.equal(getFileTypeLabel(true), "ประเภทแฟ้มบริการ");
  assert.equal(getFileTypeLabel(false), "ประเภทแฟ้มสะสม");
});
