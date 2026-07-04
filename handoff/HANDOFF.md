# SUB HDC Handoff

## System Overview

### Business Concept

SUB HDC is a local health-data import and inspection web app for HDC/F43 ZIP files. The system lets an operator upload or re-import official F43 text files, stores the rows into the matching F43 database tables, encrypts sensitive household and person-related values, provides browser views for checking imported data by HOSCODE, fiscal year, and table counts, and includes an AI chat surface for database questions, exports, and charts.

### Tech Stack

- Frontend and API: Next.js App Router, React, JavaScript route handlers.
- Runtime: Node.js with npm scripts and Playwright CLI for browser verification.
- Database: MySQL/MariaDB running in Docker.
- Data import: Node.js importer using ZIP and text-file parsing utilities.
- AI/data tools: DeepSeek-compatible OpenAI client, read-only DbQuery tool, Excel export tool, and Chart.js rendering.
- Security: AES encryption for sensitive data and NextAuth/JWT-backed app access.

### Architecture

The browser UI calls local Next.js API routes for upload, import, dashboard, report, AI chat, export, and person/home lookups. Upload routes save selected F43 ZIP files, then the import route queues and runs the Node importer. The importer reads each F43 text entry, maps it to the configured main table, encrypts configured fields, writes imported rows, and attaches the generated import log id. `proxy.js` protects sensitive pages and APIs with the app auth session. Startup migrations are read from `table_update/*.sql` by `webapp/lib/run_migrations.js`.

### Database Schema

- `c_file` is the registry of importable F43 table names and must not be cleared.
- `log_import_file` stores one row per import file: `id` integer, `file_name`, `import_date_time`, `status`, `finish_date_time`, and `not_complete_msg`.
- Main F43 tables no longer store `file_name` or `import_date_time`; they store `log_import_id` integer instead.
- `log_import_id` links imported rows back to `log_import_file.id`.
- AES-protected fields include `home.house_id`, `home.house`, `home.telephone`, `address.house_id`, and `address.houseno`; other encrypted fields follow the project encryption configuration in `webapp/lib/import_f43_node.js`.
- `address.house_id` is `varchar(1000)` for AES output. Existing DBs are updated by `table_update/20260702_address_house_id_aes_varchar_1000.sql`.
- `.env` separates `ENCRYPT_KEY` for AES from `JWT_KEY` for JWT signing.

## Main Changes

- Added `log_import_file` with `id`, `file_name`, and `import_date_time`.
- Replaced per-table `file_name` and `import_date_time` columns with `log_import_id`.
- Changed `log_import_file.id` and all main-table `log_import_id` columns to `int`.
- Updated F43 import logic to create one import log row per uploaded ZIP and write that id into imported rows.
- Added AES encryption for `HOME.house_id`, `HOME.house`, and `HOME.telephone`.
- Added AES encryption for `ADDRESS.house_id`, and resized `address.house_id` to `varchar(1000)`.
- Renamed encryption env usage from `SECRET_KEY` to `ENCRYPT_KEY`.
- Added separate `JWT_KEY` for JWT signing.
- Added `proxy.js` using the current Next.js `proxy()` convention to protect GET API calls.
- Protected `GET /api/dashboard` and `GET /api/person`; both return `401` without the app JWT cookie.
- Added AI chat chart rendering through Chart.js. Supported prompt-driven chart types are bar/default, column, line, multiline, pie, and radar.
- Added AI chat DbQuery tool-call modal: clicking a DbQuery badge opens a selectable SQL/code panel instead of an inline detail block.
- Bumped app version through the current `1.0.6` release in `webapp/package.json`.

## 2026-07-04 Update

### Complex Report SQL

Report execution now supports SQL scripts that declare session variables before the final result query.

Important files:

- `webapp/lib/report-sql.mjs`
- `webapp/app/api/report/route.js`
- `webapp/tests/report-sql.test.mjs`
- `webapp/tests/report-api-route.test.mjs`

Behavior:

- Allows leading `SET @name = ...;` statements before a final `SELECT` or `WITH ... SELECT`.
- Keeps write statements rejected.
- Splits SQL on semicolons while respecting strings and comments.
- Runs report SQL with `multipleStatements: true`.
- Extracts the final result set from multi-statement MariaDB results.

Local DB has a report named:

```text
ทดสอบ
```

The report was inserted with `id = 4`. It uses the pasted complex SQL with:

```sql
SET @ds1='20251001', @ds2='20260930';
```

DB verification showed:

```text
id=4 | name=ทดสอบ | sql_len=6733 | has_set=1 | has_cte=1
```

### Version Update Log

The app now has a file-backed update log and the dashboard version badge reads from that file instead of hard-coded package metadata.

Important files:

- `webapp/upldate_log.json`
- `webapp/lib/update-log.mjs`
- `webapp/components/dashboard-page-title.jsx`
- `webapp/app/update-log/page.js`
- `webapp/tests/update-log.test.mjs`

Current update log entries:

```text
1.0.6 | 2026-07-04 | สร้างรายงานด้วย sql ที่ซับซ้อน และกำหนดตัวแปรได้
1.0.5 | 2026-07-03 | นำเข้าไฟล์ zip ขนาดไม่เกิน 50MB
```

Notes:

- The filename is intentionally `upldate_log.json` to match the user request.
- The version badge shows the max semantic version from this JSON file.
- Clicking the version badge navigates to `/update-log`.
- The update-log page title is `Version Update Log`.
- The old label `Application version history` was removed.
- Issue text supports escaped `\n` line breaks through `.updateLogIssue { white-space: pre-line; }`.
- `webapp/package-lock.json` still has root version `1.0.5`; `npm ci` and Docker build succeeded, but update this too if strict package metadata consistency is needed.

### Local Docker Deploy

The user requested local Docker deploy after these changes.

Command run from repo root:

```powershell
docker compose up -d --build --force-recreate webapp
```

Result:

- Image build succeeded.
- `sub_hdc_web` was recreated.
- `sub_hdc_db` stayed up.
- Published route remains `0.0.0.0:80->3000`.
- Startup migrations were skipped as already applied.
- `http://localhost/login` returned `200`.
- `http://localhost/update-log` returned `200`.
- Rendered HTML contained `Version Update Log`, `1.0.6`, and `1.0.5`.
- Docker inspect showed the web container running and healthy enough for HTTP verification.

Build note:

```text
npm ci / npm prune reported existing audit warnings:
4 vulnerabilities (3 moderate, 1 high)
```

### Current Focused Verification

Most recent full Node test run:

```powershell
node --test tests\*.test.mjs
```

Result:

```text
114 tests passed, 0 failed
```

Additional checks run:

```powershell
node --test tests\update-log.test.mjs
node --check app\update-log\page.js
```

Both passed.

## Recent Schema Change

Latest schema/import update:

- `ADDRESS.house_id` is now AES-encrypted by `webapp/lib/import_f43_node.js`.
- Fresh schemas define `table/address.sql` as `house_id varchar(1000) NOT NULL DEFAULT ''`.
- Existing DBs use `table_update/20260702_address_house_id_aes_varchar_1000.sql`.
- Local DB verification confirmed `address.house_id = varchar(1000)` and `schema_migrations.id = 20260702_address_house_id_aes_varchar_1000`.

Focused verification for this change:

```powershell
node --test tests\import-f43.test.mjs tests\db-migrations.test.mjs
npm run check:node
```

Result:

```text
19 tests passed, 0 failed
```

## AI Chat Notes

The AI chat is at:

```text
http://localhost:3000/ai/chat
```

Important behavior:

- Chart rendering is driven by the latest user prompt. If no chart type is named, bar is the default.
- `column chart` renders as a vertical bar chart.
- Multiline and radar charts support multiple numeric fields when the DB query returns them.
- DbQuery badges are buttons. Click one to open a modal code panel with selectable SQL or error text.
- Chart screenshots verified during recent work:
  - `.playwright-cli/radar-chart-test.png`
  - `.playwright-cli/column-chart-test.png`
  - `.playwright-cli/dbquery-modal-code-panel.png`

## Environment

Required keys:

```env
ENCRYPT_KEY=...
JWT_KEY=...
```

`ENCRYPT_KEY` is used for AES-256-GCM data encryption.

`JWT_KEY` is used only for app JWT signing.

`SECRET_KEY` and `JWT_SECRET` are no longer used by runtime code.

## Re-import Verification

Desktop file tested through browser:

```text
C:\Users\Admin\Desktop\F43_11251_20260501163101.zip
```

Before re-import:

- Truncated 52 main import tables plus `log_import_file`.
- `TRUNCATE` succeeded for 53 tables.
- `c_file` was not truncated.

Browser import result:

- Browser reported `228,957 rows / 52 tables`.
- DB stored main rows: `219,921`.
- Non-empty main tables: `40`.
- `log_import_file` rows: `1`.
- Latest log file: `F43_11251_20260501163101.zip`.

Key table counts:

- `service`: `9,285`
- `home`: `2,152`
- `person`: `5,952`
- `charge_opd`: `55,977`

HOME AES verification after re-import:

- plain non-empty `house_id`: `0`
- plain non-empty `house`: `0`
- plain non-empty `telephone`: `0`
- encrypted non-empty `house_id`: `2,120`
- encrypted non-empty `house`: `2,145`
- encrypted non-empty `telephone`: `0` because all imported telephone values are empty

## API Protection Verification

Verified with `curl`:

- `GET /api/dashboard` without cookie: `401`
- `GET /api/dashboard` with app JWT cookie: `200`
- `GET /api/person` without cookie: `401`
- `GET /api/person` with app JWT cookie: `200`

The browser app still loads dashboard data normally because `proxy.js` issues the HttpOnly JWT cookie for app pages.

## Database Notes

The MariaDB container is `mariadb` and uses:

```text
E:/mariadb:/var/lib/mysql
```

The earlier `Tablespace is missing for a table` issue was repaired by restarting the container and rebuilding only `sub_hdc` from a dump. Current re-import verification showed:

- Fresh MariaDB error matches: `0`
- No new `Tablespace is missing` or `Cannot rename` errors.

If the InnoDB tablespace issue returns after heavy DDL, consider moving MariaDB data from the Windows bind mount to a Docker named volume.

## Local Verification Commands

Useful focused checks:

```powershell
node --test tests\*.test.mjs
node --test tests\report-sql.test.mjs tests\report-api-route.test.mjs
node --test tests\update-log.test.mjs
node --check app\update-log\page.js
node --test tests\import-f43.test.mjs tests\db-migrations.test.mjs
node --test tests\ai-chart.test.mjs tests\ai-chat-page.test.mjs
npm run check:node
node --check proxy.js
node --check lib\api-auth.mjs
node --check app\api\dashboard\route.js
node --check app\api\person\route.js
```

Historical full test result before the July 4 report/update-log work:

```text
29 tests passed, 0 failed
```

Current full test result after the July 4 report/update-log work:

```text
114 tests passed, 0 failed
```

## Current Dev Server

The local dev server was restarted after env key changes and is running at:

```text
http://localhost:3000
```

The local Docker deployment is also running through port 80:

```text
http://localhost
```

## Suggested Skills

- `handoff`: Use when updating this document for the next session.
- `db-cli`: Use for direct MariaDB inspection or report row verification.
- `playwright-cli`: Use for browser-visible checks, especially dashboard and update-log routing.
- `build-web-apps:react-best-practices`: Use when touching Next.js/React UI or route code.
- `superpowers:verification-before-completion`: Use before claiming a code or deploy task is complete.
