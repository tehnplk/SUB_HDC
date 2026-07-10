import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const migrations = require("../run_migrations.js");

async function withTempDir(callback) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-migrations-"));
  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function cFileTableNames(source) {
  return [...source.matchAll(/VALUES\s*\('([^']+)'/g)].map((match) => match[1]);
}

function hasHospcodeColumn(source) {
  return /`\s*hospcode\s*`/i.test(source);
}

function tableDefaultBytesPerChar(source) {
  const charsetMatch = source.match(/DEFAULT\s+CHARSET\s*=\s*(utf8mb4|utf8mb3|utf8)\b/i);
  const charset = charsetMatch?.[1]?.toLowerCase();
  if (charset === "utf8mb4") return 4;
  return 3;
}

function columnVarcharLengths(source) {
  const lengths = new Map();
  for (const match of source.matchAll(/`([^`]+)`\s+varchar\((\d+)\)/gi)) {
    lengths.set(match[1], Number(match[2]));
  }
  return lengths;
}

function primaryKeyColumns(source) {
  const match = source.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (!match) return [];
  return [...match[1].matchAll(/`([^`]+)`/g)].map((column) => column[1]);
}

test("listMigrationFiles returns sorted sql files only", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, "20260630_b.sql"), "SELECT 2;");
    await writeFile(path.join(dir, "20260630_a.sql"), "SELECT 1;");
    await writeFile(path.join(dir, "README.md"), "ignore");

    const files = await migrations.listMigrationFiles(dir);

    assert.deepEqual(files.map((file) => path.basename(file)), [
      "20260630_a.sql",
      "20260630_b.sql",
    ]);
  });
});

test("applyMigrationFile skips migrations already recorded", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "20260630_aes_varchar_2000.sql");
    await writeFile(file, "ALTER TABLE `home` MODIFY `house` varchar(2000);");
    const calls = [];
    const connection = {
      async query(sql, values) {
        calls.push({ sql, values });
        if (/SELECT id FROM schema_migrations/.test(sql)) {
          return [[{ id: "20260630_aes_varchar_2000" }]];
        }
        return [[]];
      },
    };

    const result = await migrations.applyMigrationFile(connection, file);

    assert.deepEqual(result, { id: "20260630_aes_varchar_2000", status: "skipped" });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /SELECT id FROM schema_migrations/);
  });
});

test("applyMigrationFile applies sql and records migration id", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "20260630_aes_varchar_2000.sql");
    await writeFile(file, "\uFEFFALTER TABLE `home` MODIFY `house` varchar(2000);");
    const calls = [];
    const connection = {
      async query(sql, values) {
        calls.push({ sql, values });
        if (/SELECT id FROM schema_migrations/.test(sql)) return [[]];
        return [[]];
      },
    };

    const result = await migrations.applyMigrationFile(connection, file);

    assert.deepEqual(result, { id: "20260630_aes_varchar_2000", status: "applied" });
    assert.equal(calls.length, 3);
    assert.equal(calls[1].sql, "ALTER TABLE `home` MODIFY `house` varchar(2000);");
    assert.match(calls[2].sql, /INSERT INTO schema_migrations/);
    assert.deepEqual(calls[2].values, ["20260630_aes_varchar_2000"]);
  });
});

test("initial table schemas define hospcode columns as varchar 10", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const files = (await readdir(tableDir)).filter((file) => file.endsWith(".sql"));
  const offenders = [];

  for (const file of files) {
    const source = await readFile(path.join(tableDir, file), "utf8");
    if (!hasHospcodeColumn(source)) continue;
    if (/`\s*hospcode\s*`\s+varchar\(5\)/i.test(source)) offenders.push(file);
  }

  assert.deepEqual(offenders, []);
});

test("schema sql files do not force ascii charset or collation", async () => {
  const schemaDirs = [
    path.resolve(process.cwd(), "table"),
    path.resolve(process.cwd(), "table_update"),
  ];
  const offenders = [];

  for (const dir of schemaDirs) {
    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql"));
    for (const file of files) {
      const source = await readFile(path.join(dir, file), "utf8");
      if (/\bCHARACTER\s+SET\s+ascii\b|\bascii_general_ci\b/i.test(source)) {
        offenders.push(path.join(path.basename(dir), file));
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test("sql_for_sync_data schema is available through the initial schema and migration", async () => {
  const tablePath = path.resolve(process.cwd(), "table", "sql_for_sync_data.sql");
  const migrationPath = path.resolve(
    process.cwd(),
    "table_update",
    "20260710_create_sql_for_sync_data.sql"
  );
  const uniqueTopicMigrationPath = path.resolve(
    process.cwd(),
    "table_update",
    "20260710_make_sql_sync_topic_unique.sql"
  );
  const expectedColumns = [
    "id",
    "kpi_name",
    "topic",
    "kpi_group",
    "interval_minute",
    "tables_use",
    "sql_command",
    "note",
    "d_update",
    "is_active",
  ];

  for (const source of [await readFile(tablePath, "utf8"), await readFile(migrationPath, "utf8")]) {
    assert.match(source, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`sql_for_sync_data`/i);
    for (const column of expectedColumns) {
      assert.match(source, new RegExp("`" + column + "`", "i"));
    }
    assert.match(source, /KEY\s+`idx_sql_for_sync_data_kpi_name`\s+\(`kpi_name`\)/i);
    assert.match(source, /KEY\s+`idx_sql_for_sync_data_active`\s+\(`is_active`\)/i);
  }

  const initialSchema = await readFile(tablePath, "utf8");
  assert.match(initialSchema, /`topic`\s+varchar\(255\)\s+NOT\s+NULL/i);
  assert.match(initialSchema, /UNIQUE\s+KEY\s+`uq_sql_for_sync_data_topic`\s+\(`topic`\)/i);

  const uniqueTopicMigration = await readFile(uniqueTopicMigrationPath, "utf8");
  assert.match(uniqueTopicMigration, /MODIFY\s+COLUMN\s+`topic`\s+varchar\(255\)\s+NOT\s+NULL/i);
  assert.match(uniqueTopicMigration, /DROP\s+INDEX\s+IF\s+EXISTS\s+`idx_sql_for_sync_data_topic`/i);
  assert.match(uniqueTopicMigration, /ADD\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+`uq_sql_for_sync_data_topic`\s+\(`topic`\)/i);
});

test("initial table primary keys fit the table charset key length limit", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const files = (await readdir(tableDir)).filter((file) => file.endsWith(".sql"));
  const offenders = [];

  for (const file of files) {
    const source = await readFile(path.join(tableDir, file), "utf8");
    const varcharLengths = columnVarcharLengths(source);
    const keyColumns = primaryKeyColumns(source);
    const varcharKeyChars = keyColumns.reduce(
      (total, column) => total + (varcharLengths.get(column) || 0),
      0
    );
    const keyBytes = varcharKeyChars * tableDefaultBytesPerChar(source);
    if (keyBytes > 3072) offenders.push(`${file}:${keyBytes}`);
  }

  assert.deepEqual(offenders, []);
});

test("hospcode varchar 10 migration covers c_file tables with hospcode", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const cFileSource = await readFile(path.join(tableDir, "c_file.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "table_update",
    "20260701_hospcode_varchar_10.sql"
  );
  const source = await readFile(migrationPath, "utf8");
  const expectedTables = [];

  for (const table of cFileTableNames(cFileSource)) {
    const tablePath = path.join(tableDir, `${table}.sql`);
    const tableSource = await readFile(tablePath, "utf8");
    if (hasHospcodeColumn(tableSource)) expectedTables.push(table);
  }

  const alterStatements = [
    ...source.matchAll(
      /ALTER\s+TABLE\s+`([^`]+)`\s+MODIFY\s+`hospcode`\s+varchar\(10\)\s+NOT\s+NULL\s+DEFAULT\s+'';/gi
    ),
  ];
  const actualTables = alterStatements.map((match) => match[1]);

  assert.deepEqual(actualTables, expectedTables);
  assert.equal(new Set(actualTables).size, actualTables.length);
});

test("address house_id is AES-sized in initial schema and migration", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const addressSource = await readFile(path.join(tableDir, "address.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "table_update",
    "20260702_address_house_id_aes_varchar_1000.sql"
  );
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(addressSource, /`house_id`\s+varchar\(1000\)\s+NOT\s+NULL\s+DEFAULT\s+''/i);
  assert.match(
    migrationSource,
    /ALTER\s+TABLE\s+`address`\s+MODIFY\s+`house_id`\s+varchar\(1000\)\s+NOT\s+NULL\s+DEFAULT\s+'';/i
  );
});

test("log import file schema stores uploaded file size after file name", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const schemaSource = await readFile(path.join(tableDir, "log_import_file.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "table_update",
    "20260702_log_import_file_file_size.sql"
  );
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(
    schemaSource,
    /`file_name`\s+varchar\(255\)\s+NOT\s+NULL\s+DEFAULT\s+''[\s\S]*`file_size`\s+bigint\(20\)\s+DEFAULT\s+NULL/i
  );
  assert.match(
    migrationSource,
    /ALTER\s+TABLE\s+`log_import_file`\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+`file_size`\s+bigint\(20\)\s+DEFAULT\s+NULL\s+AFTER\s+`file_name`;/i
  );
});

test("service chiefcomp is text in initial schema and migration", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const serviceSource = await readFile(path.join(tableDir, "service.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "table_update",
    "20260703_service_chiefcomp_text.sql"
  );
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(serviceSource, /`chiefcomp`\s+text\s+NOT\s+NULL/i);
  assert.doesNotMatch(serviceSource, /`chiefcomp`\s+varchar\(/i);
  assert.match(
    migrationSource,
    /ALTER\s+TABLE\s+`service`\s+MODIFY\s+`chiefcomp`\s+text\s+NOT\s+NULL;/i
  );
});

test("report query indexes exist in initial schemas and migrations", async () => {
  const tableDir = path.resolve(process.cwd(), "table");
  const migrationDir = path.resolve(process.cwd(), "table_update");

  const expected = [
    ["20260710_report_query_indexes.sql", "person.sql", "person", "idx_person_cid", "(`cid`)"],
    [
      "20260710_report_query_indexes.sql",
      "labfu.sql",
      "labfu",
      "idx_labfu_labtest_dateserv_cid",
      "(`labtest`,`date_serv`,`cid`)",
    ],
    [
      "20260710_report_query_indexes.sql",
      "diagnosis_opd.sql",
      "diagnosis_opd",
      "idx_diagnosis_opd_diagcode_dateserv_cid",
      "(`diagcode`,`date_serv`,`cid`)",
    ],
    [
      "20260710_report_query_indexes.sql",
      "diagnosis_ipd.sql",
      "diagnosis_ipd",
      "idx_diagnosis_ipd_diagcode_admit_cid",
      "(`diagcode`,`datetime_admit`,`cid`)",
    ],
    [
      "20260710_service_drug_indexes.sql",
      "service.sql",
      "service",
      "idx_service_cid_dateserv",
      "(`cid`,`date_serv`)",
    ],
    [
      "20260710_service_drug_indexes.sql",
      "service.sql",
      "service",
      "idx_service_dateserv_cid",
      "(`date_serv`,`cid`)",
    ],
    [
      "20260710_service_drug_indexes.sql",
      "drug_opd.sql",
      "drug_opd",
      "idx_drug_opd_didstd_dateserv_cid",
      "(`didstd`,`date_serv`,`cid`)",
    ],
    [
      "20260710_service_drug_indexes.sql",
      "drug_ipd.sql",
      "drug_ipd",
      "idx_drug_ipd_didstd_admit_cid",
      "(`didstd`,`datetime_admit`,`cid`)",
    ],
    ...[
      ["nutrition", "idx_nutrition_cid_dateserv", "(`cid`,`date_serv`)"],
      ["nutrition", "idx_nutrition_dateserv_cid", "(`date_serv`,`cid`)"],
      [
        "procedure_opd",
        "idx_procedure_opd_procedcode_dateserv_cid",
        "(`procedcode`,`date_serv`,`cid`)",
      ],
      ["procedure_opd", "idx_procedure_opd_cid_dateserv", "(`cid`,`date_serv`)"],
      ["specialpp", "idx_specialpp_ppspecial_dateserv_cid", "(`ppspecial`,`date_serv`,`cid`)"],
      ["specialpp", "idx_specialpp_cid_dateserv", "(`cid`,`date_serv`)"],
      ["appointment", "idx_appointment_cid_dateserv", "(`cid`,`date_serv`)"],
      ["card", "idx_card_cid", "(`cid`)"],
      ["chronicfu", "idx_chronicfu_cid_dateserv", "(`cid`,`date_serv`)"],
      ["chronicfu", "idx_chronicfu_dateserv_cid", "(`date_serv`,`cid`)"],
      ["address", "idx_address_cid", "(`cid`)"],
      ["chronic", "idx_chronic_chronic_cid", "(`chronic`,`cid`)"],
      ["chronic", "idx_chronic_cid", "(`cid`)"],
      ["rehabilitation", "idx_rehabilitation_cid_dateserv", "(`cid`,`date_serv`)"],
      [
        "procedure_ipd",
        "idx_procedure_ipd_procedcode_admit_cid",
        "(`procedcode`,`datetime_admit`,`cid`)",
      ],
      ["accident", "idx_accident_cid_datetimeserv", "(`cid`,`datetime_serv`)"],
      ["epi", "idx_epi_vaccinetype_dateserv_cid", "(`vaccinetype`,`date_serv`,`cid`)"],
      ["epi", "idx_epi_cid_dateserv", "(`cid`,`date_serv`)"],
      ["ncdscreen", "idx_ncdscreen_cid_dateserv", "(`cid`,`date_serv`)"],
      ["dental", "idx_dental_cid_dateserv", "(`cid`,`date_serv`)"],
    ].map(([tableName, indexName, columns]) => [
      "20260710_wide_report_indexes.sql",
      `${tableName}.sql`,
      tableName,
      indexName,
      columns,
    ]),
  ];

  for (const [migrationFile, schemaFile, tableName, indexName, columns] of expected) {
    const schemaSource = await readFile(path.join(tableDir, schemaFile), "utf8");
    assert.ok(
      schemaSource.includes(`KEY \`${indexName}\` ${columns}`),
      `${schemaFile} should define ${indexName} on ${columns}`
    );
    const migrationSource = await readFile(path.join(migrationDir, migrationFile), "utf8");
    const columnsWithSpaces = columns.replace(/,/g, ", ");
    assert.ok(
      migrationSource.includes(
        `ALTER TABLE \`${tableName}\` ADD INDEX IF NOT EXISTS \`${indexName}\` ${columnsWithSpaces};`
      ),
      `${migrationFile} should add ${indexName} to ${tableName}`
    );
  }
});

// ---- lookup dumps (table/lookup/*.sql) โหลดอัตโนมัติผ่าน run_migrations ----
// ไซต์ทุกที่รันแค่ `docker compose up -d --build` — id ผูก content hash:
// ไฟล์เดิมโหลดครั้งเดียว แก้ไฟล์แล้วโหลดซ้ำเองรอบถัดไป

function makeMigrationConn() {
  const executed = [];
  const applied = new Set();
  return {
    executed,
    applied,
    async query(sql, params) {
      if (/SELECT id FROM schema_migrations/.test(sql)) {
        return [applied.has(params[0]) ? [{ id: params[0] }] : []];
      }
      if (/INSERT INTO schema_migrations/.test(sql)) {
        applied.add(params[0]);
        return [{}];
      }
      executed.push(sql);
      return [{}];
    },
  };
}

test("lookupMigrationId is bound to file content, not just the name", () => {
  const idA = migrations.lookupMigrationId("/x/c_hospital.sql", "INSERT A");
  const idASame = migrations.lookupMigrationId("/y/c_hospital.sql", "INSERT A");
  const idB = migrations.lookupMigrationId("/x/c_hospital.sql", "INSERT B");

  assert.match(idA, /^lookup_c_hospital_[0-9a-f]{12}$/);
  assert.equal(idA, idASame);
  assert.notEqual(idA, idB);
});

test("applyLookupFile loads a dump once and reloads only when its content changes", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "c_hostype.sql");
    await writeFile(file, "DROP TABLE IF EXISTS `c_hostype`; CREATE TABLE `c_hostype` (a int);");
    const conn = makeMigrationConn();

    const first = await migrations.applyLookupFile(conn, file);
    assert.equal(first.status, "applied");
    assert.equal(conn.executed.length, 1);

    // ไฟล์เดิม → ข้าม ไม่รันซ้ำ
    const second = await migrations.applyLookupFile(conn, file);
    assert.equal(second.status, "skipped");
    assert.equal(conn.executed.length, 1);

    // แก้เนื้อไฟล์ (เช่น เพิ่ม รพ.ใหม่) → hash เปลี่ยน → โหลดซ้ำอัตโนมัติ
    await writeFile(file, "DROP TABLE IF EXISTS `c_hostype`; CREATE TABLE `c_hostype` (a int, b int);");
    const third = await migrations.applyLookupFile(conn, file);
    assert.equal(third.status, "applied");
    assert.equal(conn.executed.length, 2);
    assert.notEqual(third.id, first.id);
  });
});

test("compose mounts table/lookup into migrate so run_migrations can load dumps", async () => {
  const compose = await readFile(path.resolve(process.cwd(), "..", "docker-compose.yml"), "utf8");
  assert.match(compose, /- \.\/migrate\/table\/lookup:\/migrate\/table\/lookup:ro/);
});
