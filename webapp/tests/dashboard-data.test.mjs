import assert from "node:assert/strict";
import test from "node:test";

import {
  datePrefixExpression,
  chooseMonthlyDateColumn,
  chooseSelectedFile,
  getFileTypeLabel,
  getMonthlyRowTotal,
  getFiscalYearRange,
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

test("chooseMonthlyDateColumn returns null when monthly date columns are missing", () => {
  assert.equal(chooseMonthlyDateColumn(["hospcode", "d_update"]), null);
});

test("datePrefixExpression reads the first 8 digits from datetime columns", () => {
  assert.equal(datePrefixExpression("datetime_admit"), "LEFT(`datetime_admit`, 8)");
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
