# SUB HDC Handoff

## Summary

This update changes the import metadata model, hardens GET API access with an app-issued JWT cookie, and separates AES and JWT secrets.

## Main Changes

- Added `log_import_file` with `id`, `file_name`, and `import_date_time`.
- Replaced per-table `file_name` and `import_date_time` columns with `log_import_id`.
- Changed `log_import_file.id` and all main-table `log_import_id` columns to `int`.
- Updated F43 import logic to create one import log row per uploaded ZIP and write that id into imported rows.
- Added AES encryption for `HOME.house_id`, `HOME.house`, and `HOME.telephone`.
- Renamed encryption env usage from `SECRET_KEY` to `ENCRYPT_KEY`.
- Added separate `JWT_KEY` for JWT signing.
- Added `proxy.js` using the current Next.js `proxy()` convention to protect GET API calls.
- Protected `GET /api/dashboard` and `GET /api/person`; both return `401` without the app JWT cookie.

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

These passed before handoff:

```powershell
node --test tests\*.test.mjs
npm run check:node
node --check proxy.js
node --check lib\api-auth.mjs
node --check app\api\dashboard\route.js
node --check app\api\person\route.js
```

Latest full test result:

```text
29 tests passed, 0 failed
```

## Current Dev Server

The local dev server was restarted after env key changes and is running at:

```text
http://localhost:3000
```
