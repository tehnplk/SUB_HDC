const path = require("node:path");
const crypto = require("node:crypto");
const { TextDecoder } = require("node:util");

const AdmZip = require("adm-zip");
const iconv = require("iconv-lite");

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;
const SYSTEM_METADATA_COLUMNS = new Set(["file_name", "import_date_time", "log_import_id"]);

const ENCRYPT_RULES = {
  md5: {
    ACCIDENT: ["cid"],
    ADDRESS: ["cid"],
    ADMISSION: ["cid"],
    ANC: ["cid"],
    APPOINTMENT: ["cid"],
    CARD: ["cid"],
    CHARGE_IPD: ["cid"],
    CHARGE_OPD: ["cid"],
    CHRONIC: ["cid"],
    CHRONICFU: ["cid"],
    COMMUNITY_SERVICE: ["cid"],
    DEATH: ["cid"],
    DENTAL: ["cid"],
    DIAGNOSIS_IPD: ["cid"],
    DIAGNOSIS_OPD: ["cid"],
    DISABILITY: ["cid"],
    DRUGALLERGY: ["cid"],
    DRUG_IPD: ["cid"],
    DRUG_OPD: ["cid"],
    EPI: ["cid"],
    FP: ["cid"],
    FUNCTIONAL: ["cid"],
    ICF: ["cid"],
    LABFU: ["cid"],
    LABOR: ["cid"],
    NCDSCREEN: ["cid"],
    NEWBORN: ["cid"],
    NEWBORNCARE: ["cid"],
    NUTRITION: ["cid"],
    PERSON: ["cid", "father", "mother", "couple", "passport"],
    POSTNATAL: ["cid"],
    PRENATAL: ["cid"],
    PROCEDURE_IPD: ["cid"],
    PROCEDURE_OPD: ["cid"],
    PROVIDER: ["cid"],
    REHABILITATION: ["cid"],
    SERVICE: ["cid"],
    SPECIALPP: ["cid"],
    SURVEILLANCE: ["cid"],
    WOMEN: ["cid"],
  },
  aes: {
    PERSON: ["lname", "telephone", "mobile"],
    ADDRESS: ["house_id", "houseno"],
    HOME: ["house_id", "house", "telephone"],
    PROVIDER: ["lname"],
    SERVICE: ["insid"],
    CARD: ["insid"],
  },
};

function getAesKey(env) {
  const raw = env.ENCRYPT_KEY || "change_me";
  return crypto.createHash("sha256").update(raw).digest();
}

function md5(value) {
  if (!value) return value;
  return crypto.createHash("md5").update(String(value)).digest("hex");
}

function encryptAes(value, key) {
  if (!value) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("hex");
}

function encryptFileRows(file, aesKey) {
  const tableRulesKey = file.tableName.toUpperCase();
  const md5Columns = new Set((ENCRYPT_RULES.md5[tableRulesKey] || []).map((column) => column.toLowerCase()));
  const aesColumns = new Set((ENCRYPT_RULES.aes[tableRulesKey] || []).map((column) => column.toLowerCase()));
  const cidIndex = file.columns.findIndex((column) => column.toLowerCase() === "cid");
  const shouldAddCidAes =
    md5Columns.has("cid") &&
    cidIndex >= 0 &&
    !file.columns.some((column) => column.toLowerCase() === "cid_aes");

  if (!md5Columns.size && !aesColumns.size && !shouldAddCidAes) {
    return file;
  }

  const encryptedRows = file.rows.map((row) =>
    row.map((value, index) => {
      const column = file.columns[index]?.toLowerCase();
      if (md5Columns.has(column)) return md5(value);
      if (aesColumns.has(column)) return encryptAes(value, aesKey);
      return value;
    }).concat(shouldAddCidAes ? [encryptAes(row[cidIndex], aesKey)] : [])
  );

  return {
    ...file,
    columns: shouldAddCidAes ? file.columns.concat("cid_aes") : file.columns,
    rows: encryptedRows,
  };
}

function quoteIdentifier(name) {
  if (!name || !IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid MySQL identifier: ${name}`);
  }
  return `\`${name}\``;
}

function decodeText(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return iconv.decode(buffer, "cp874").replace(/^\uFEFF/, "");
  }
}

function readF43Files(zipPath, sourceFileName) {
  const zip = new AdmZip(zipPath);
  const zipFileName = sourceFileName || path.basename(zipPath);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".txt"))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))
    .map((entry) => {
      const text = decodeText(entry.getData());
      const lines = text.split(/\r?\n/);
      while (lines.length && lines[lines.length - 1] === "") lines.pop();
      if (!lines.length) throw new Error(`Missing header in ${entry.entryName}`);

      const columns = lines[0].split("|").map((column) => column.trim().toLowerCase());
      if (columns.some((column) => !column)) {
        throw new Error(`Blank column name in ${entry.entryName}`);
      }

      // แถวที่จำนวนคอลัมน์ไม่ตรง header ไม่ล้มทั้งแฟ้ม: เก็บลง invalidLines
      // ให้ผู้เรียกเขียนเป็นไฟล์ *_ERROR.txt ไว้ตรวจสอบ แล้วนำเข้าเฉพาะแถวดี
      const rows = [];
      const invalidLines = [];
      for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line) continue;
        const row = line.split("|");
        if (row.length !== columns.length) {
          invalidLines.push({ line: index + 1, raw: line });
          continue;
        }
        rows.push(row);
      }

      return {
        fileName: zipFileName,
        tableName: path.basename(entry.entryName, path.extname(entry.entryName)).toLowerCase(),
        columns,
        headerLine: lines[0],
        rows,
        invalidLines,
      };
    });
}

// เดาชื่อแฟ้มมาตรฐานจากชื่อไฟล์ที่มี suffix ต่อท้าย (เช่น
// accident_07487_20251001085344 -> accident) โดยหา prefix ที่ยาวที่สุดใน
// รายชื่อตารางจริงที่ชื่อไฟล์ขึ้นต้นด้วย เทียบกับรายชื่อจริงจึงจัดการชื่อที่มี
// underscore ในตัว (drug_opd, charge_ipd) ได้ถูก ไม่ตัดพลาดเป็น drug/charge
function guessCanonicalTable(tableName, existingTableNames) {
  const name = String(tableName).toLowerCase();
  let best = null;
  for (const candidate of existingTableNames) {
    const c = String(candidate).toLowerCase();
    // ต้องขึ้นต้นด้วย candidate แล้วตามด้วยตัวคั่น (ไม่ใช่ prefix ของคำอื่น เช่น
    // "drug" ไม่ควรแมตช์ "drugallergy") — suffix ที่ตามมาคือ _<hospcode>_<time>
    if (name === c || name.startsWith(`${c}_`)) {
      if (!best || c.length > best.length) best = c;
    }
  }
  return best;
}

async function getExistingColumns(connection, tableName) {
  try {
    const [rows] = await connection.execute(`SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`);
    return new Map(rows.map((row) => [row.Field.toLowerCase(), row.Field]));
  } catch (error) {
    // ตารางไม่มี = ชื่อไฟล์ .txt ในซิปผิดรูปแบบ (มักมี suffix _hospcode_timestamp
    // ต่อท้ายชื่อแฟ้ม) แปลง error เป็นข้อความไทยที่บอกวิธีแก้ให้ผู้ใช้เข้าใจ
    if (error?.code === "ER_NO_SUCH_TABLE") {
      let suggestion = "";
      try {
        // c_file คือทะเบียนชื่อแฟ้มมาตรฐาน (importable F43 tables) — ใช้ตัวนี้
        // เดาชื่อ ไม่ใช่ information_schema ที่มีตารางระบบ (log_import_file ฯลฯ) ปน
        const [tables] = await connection.execute("SELECT file_name FROM c_file");
        const guess = guessCanonicalTable(tableName, tables.map((t) => t.file_name));
        if (guess) suggestion = ` (ควรเป็น "${guess}.txt")`;
      } catch {
        // ถ้า query c_file ไม่ได้ ก็แจ้งแบบไม่มีชื่อที่แนะนำ
      }
      throw new Error(
        `ชื่อไฟล์ในซิปไม่ตรงชื่อแฟ้มมาตรฐาน: "${tableName}.txt"${suggestion} กรุณา export ไฟล์ใหม่`
      );
    }
    throw error;
  }
}

// คืน Map ของ column (lowercase) -> ความยาวสูงสุดเป็นจำนวนอักขระ สำหรับชนิด
// ที่มี CHARACTER_MAXIMUM_LENGTH (varchar/char/text) เพื่อใช้ตัดค่าที่ยาวเกิน
// ก่อนนำเข้า ป้องกัน "Data too long" ที่ทำ LOAD DATA ล้มทั้งแฟ้ม
async function getColumnMaxLengths(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  const lengths = new Map();
  for (const row of rows) {
    const max = row.CHARACTER_MAXIMUM_LENGTH;
    if (max != null && Number(max) > 0) {
      lengths.set(String(row.COLUMN_NAME).toLowerCase(), Number(max));
    }
  }
  return lengths;
}

// ตัดค่าฟิลด์ text ที่ยาวเกินความกว้างคอลัมน์ (นับเป็นอักขระ ไม่ใช่ไบต์)
// แก้ไข rows ในตัว และคืนสรุปว่าตัดคอลัมน์ไหนไปกี่แถว
function truncateRowsToColumnWidths(file, columnMaxLengths) {
  if (!columnMaxLengths || !columnMaxLengths.size) return [];
  const truncatedCounts = new Map();

  for (const row of file.rows) {
    for (let index = 0; index < file.columns.length; index += 1) {
      const column = file.columns[index]?.toLowerCase();
      const max = columnMaxLengths.get(column);
      if (max == null) continue;
      const value = row[index];
      if (value == null) continue;
      const text = String(value);
      // ใช้ spread เพื่อนับ/ตัดตาม code point ไม่ให้ surrogate pair (อีโมจิ ฯลฯ) ขาดกลาง
      const chars = [...text];
      if (chars.length > max) {
        row[index] = chars.slice(0, max).join("");
        truncatedCounts.set(column, (truncatedCounts.get(column) || 0) + 1);
      }
    }
  }

  return [...truncatedCounts.entries()].map(([column, count]) => ({ column, count }));
}

function getImportColumns(existingColumns, file, logImportId) {
  const importColumns = file.columns
    .filter((column) => !SYSTEM_METADATA_COLUMNS.has(column.toLowerCase()))
    .filter((column) => existingColumns.has(column.toLowerCase()))
    .map((column) => existingColumns.get(column.toLowerCase()));
  const missingColumns = file.columns.filter((column) => {
    const normalized = column.toLowerCase();
    return !SYSTEM_METADATA_COLUMNS.has(normalized) && !existingColumns.has(normalized);
  });

  if (existingColumns.has("log_import_id")) {
    if (logImportId === undefined || logImportId === null) {
      throw new Error(`${file.tableName}: log_import_id is required`);
    }
    importColumns.push(existingColumns.get("log_import_id"));
  }

  if (!importColumns.length) {
    throw new Error(`${file.tableName}: no importable columns found`);
  }

  return { importColumns, missingColumns };
}

module.exports = {
  ENCRYPT_RULES,
  SYSTEM_METADATA_COLUMNS,
  decodeText,
  encryptAes,
  encryptFileRows,
  getAesKey,
  getColumnMaxLengths,
  getExistingColumns,
  getImportColumns,
  guessCanonicalTable,
  md5,
  quoteIdentifier,
  readF43Files,
  truncateRowsToColumnWidths,
};
