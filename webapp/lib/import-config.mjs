import { readFileSync } from "node:fs";
import path from "node:path";

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// Tuning knobs for the import queue and stale-record cleanup. These used to
// live in .env; they now come from config.json so all import settings sit in
// one place next to import.method.
export const IMPORT_SETTING_DEFAULTS = {
  queueConcurrency: 1,
  queueCapacity: 120,
  userMaxZips: 12,
  staleMinutes: 120,
};

function importConfigPath() {
  return process.env.IMPORT_CONFIG_PATH || path.join(process.cwd(), "config.json");
}

function readImportSection() {
  try {
    const parsed = JSON.parse(readFileSync(importConfigPath(), "utf8"));
    return parsed?.import || {};
  } catch {
    return {};
  }
}

export function loadImportSettings() {
  const section = readImportSection();
  return {
    queueConcurrency: positiveInt(section.queueConcurrency, IMPORT_SETTING_DEFAULTS.queueConcurrency),
    queueCapacity: positiveInt(section.queueCapacity, IMPORT_SETTING_DEFAULTS.queueCapacity),
    userMaxZips: positiveInt(section.userMaxZips, IMPORT_SETTING_DEFAULTS.userMaxZips),
    staleMinutes: positiveInt(section.staleMinutes, IMPORT_SETTING_DEFAULTS.staleMinutes),
  };
}
