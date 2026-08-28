# Hand-off: Webapp UI Flow

## Removed routes

- `/person` and `/api/person` were removed on 2026-07-23. Do not restore their
  breadcrumb or authentication-proxy entries unless the feature is intentionally
  reintroduced.
- โมดูล "เร่งรัดติดตาม" (`/rapid`, `/api/rapid`) was removed on 2026-08-28 together with
  its badge, breadcrumb, legacy `/rapid/{report_id}` redirects, and `rapid*`
  styles. Its right-aligned main-tab slot is now held by the GIS module.
  Transform tables `s_dm_control`, `s_dm_screen_risk`, `s_ht_screen_risk`, and
  `s_epi2` were left untouched.

## GIS module

- `/gis` (label `GIS`, lucide `Map`) occupies the right-aligned `TABS_END` group in
  `main-tab.jsx`; `.tabButton.tabButtonEnd { margin-left: auto }` pushes that group
  and the trailing Add-On tab to the right edge of the tab bar.
- Breadcrumb entry: `{ prefix: "/gis", href: "/gis", label: "GIS" }` in
  `module-header.jsx`.
- `webapp/app/gis/page.js` renders `ModuleHeader` + `<GisMap />`. `/gis` deliberately
  has **no** `BREADCRUMB_MODULES` entry, so no `GIS` breadcrumb line renders above
  the map — the main tab already names the module and the map gets the height.
- Focused source tests: `webapp/tests/module-header.test.mjs`,
  `webapp/tests/gis-map.test.mjs`.

### Leaflet map

- `webapp/components/gis-map.jsx` is a client component. `leaflet` is loaded with a
  lazy `import("leaflet")` inside `useEffect` — the same idiom the Ask AI page uses
  for chart.js — because Leaflet needs `window`. `leaflet/dist/leaflet.css` is a
  static import in that file.
- A `mapRef` guard keeps React StrictMode's double mount in dev from raising
  "Map container is already initialized"; the cleanup calls `map.remove()`.
- Leaflet's own `L.control.layers` is not used. The three base layers are switched
  from a segmented button-group toggle (`.gisLayerToggle`) that the component
  renders itself and positions absolutely over the map's top-right corner
  (`z-index: 1000`, above Leaflet's own controls). The active button carries
  `aria-pressed` and `.gisLayerToggleBtnActive`.
- Layer state lives in React (`activeLayer`); an effect adds the selected
  `L.tileLayer` and removes the others. The tile layers are built once into
  `layersRef` when the map is created, and a `ready` flag keeps that effect from
  running before the async `import("leaflet")` resolves.
- The three options are แผนที่ถนน (OpenStreetMap, the default), ภาพถ่ายดาวเทียม
  (Esri World Imagery), and ภูมิประเทศ (OpenTopoMap, capped at `maxZoom: 17`
  because that is as deep as its tiles go). All three are keyless public tile
  services and each carries its provider attribution.
### Data layers panel

- One panel entry renders one `.gisDataPanel` in the shared `.gisMapPanels` stack
  under the tile toggle, and each layer inside it renders one checkbox. The panel
  list is built in the component: `BASE_DATA_PANEL` (`ชั้นข้อมูลพื้นฐาน` →
  ขอบเขตตำบล) is a static const, while `ชั้นข้อมูลกลุ่มเปราะบาง` is built from
  `vulnerableTypes`. `dataLayers` is `layerPanels.flatMap(...)`, so the
  fit/toggle/style effects keep working on a flat list — they take `dataLayers` in
  their deps because that list grows once the lookup arrives.
- The vulnerable panel has **one checkbox per `c_vulnerable` row**, not one for the
  whole group. `GET /api/gis/c-vulnerable` returns the `is_active = 1` rows, and
  `vulnerableLayer()` turns each into a layer with id `vulnerable-<id>` hitting
  `/api/gis/vulnerable?vulnerable=<id>`. Each group gets its own colour from
  `VULNERABLE_COLORS` (cycled by index — the lookup has no colour column) and its
  pin glyph from `c_vulnerable.icon`, so the groups stay distinguishable on the map. A panel with no layers renders nothing
  rather than an empty box.
- A layer carrying a `pin` config is drawn through `pointToLayer` as an
  `L.marker` with an `L.divIcon` — a teardrop pin (`.gisPin`, a circle with one
  square corner rotated -45°) holding an icon that conveys the type. `iconAnchor`
  puts the pin's tip on the real coordinate. The glyphs live in `PIN_ICONS` as raw
  lucide SVG path markup, because `divIcon` takes an HTML string rather than a
  React element; an unknown icon name falls back to `DEFAULT_PIN_ICON` instead of
  rendering an empty pin.
- Markers have no `setStyle`, so the basemap restyle skips any layer without a
  `style` — pins keep their colour and stay legible on imagery through their white
  border.
- Clicking a pin opens a popup (`vulnerablePopupHtml`) with name, กลุ่ม, เพศ,
  วันเกิด (converted to พ.ศ. with the age), หน่วยบริการ and PID; pins have no hover
  tooltip. Boundary polygons still use a hover tooltip with `name_th`. The popup
  HTML is assembled by hand, so every DB value goes through `escapeHtml` first.
- `ขอบเขตตำบล` is **on by default**: the initial `activeDataLayers` state is derived
  from each entry's `defaultOn` flag, so turning another layer on by default is a
  config change, not a state change.
- The map's opening view fits that layer's extent rather than the fixed province
  view: once Leaflet is ready the component fetches the boundary GeoJSON, takes
  `L.geoJSON(geojson).getBounds()`, and calls `fitBounds` with 16px padding.
  `fittedRef` keeps it to one fit, and an invalid or failed load leaves
  `DEFAULT_CENTER` / `DEFAULT_ZOOM` in place. `DEFAULT_FIT_LAYER_ID` names the
  layer the fit is taken from.
- `fetchLayerGeoJson` caches each layer's GeoJSON in `geoJsonCacheRef`, so the
  opening fit and the checkbox share a single request. Once a layer has been built
  it lives in `dataLayersRef` and toggling only adds/removes the existing
  `L.geoJSON` layer. A failed fetch shows the message in the panel and returns the
  checkbox to off. Each polygon binds a sticky tooltip with `name_th`.
- Overlay styling follows the active basemap. The satellite entry is flagged
  `imagery: true`, and `dataLayerStyle()` returns the layer's `imageryStyle`
  (bright yellow `#fde047`) instead of its default dark-green `style` whenever an
  imagery basemap is on — the dark stroke is invisible against aerial photography.
  The base-layer effect re-runs `setStyle` on every existing overlay when the
  basemap changes, and a layer created later reads the current basemap from
  `activeLayerRef`. Give any new overlay both `style` and `imageryStyle`.
- Clicking a polygon used to leave a rectangle on the map: the browser focuses the
  `path.leaflet-interactive` and its default focus ring is drawn around the path's
  bounding box. `.gisMap .leaflet-interactive:focus { outline: none }` removes it,
  and a `:focus-visible` rule keeps a real ring for keyboard users.
### Add Point toolbox

- The `เพิ่มหมุด` button lives at the foot of the `ชั้นข้อมูลกลุ่มเปราะบาง` panel
  (`.gisPanelTool`, rendered only for `VULNERABLE_PANEL_TITLE`), not in a separate
  floating toolbox. It toggles `addMode`, which registers a one-shot
  `map.on("click")`. The mode hints render under the button in the same panel.
- The first map click **drops a red draggable draft pin** (`DRAFT_PIN_COLOR`, plus
  glyph) and disarms the mode — it does not open the form yet. The user drags the
  pin to adjust the position (`dragend` updates `draftPos`) and clicks it to open
  the form. Leaflet suppresses the marker `click` that follows a drag, so dragging
  never opens the form by accident.
- Draft position and form fields are separate state (`draftPos` / `draftFields` /
  `formOpen`), so the pin survives closing the form. `cancelDraft()` removes the
  marker and clears all three; the toolbox button also calls it when re-arming.
- While armed the container gets `.gisMapAdding` for a crosshair cursor. That rule
  needs two classes (`.gisMap.gisMapAdding`) to beat Leaflet's `.leaflet-grab`,
  which sets `cursor: grab` on the same element.
- The draft form (`.gisAddForm`) posts to `POST /api/gis/vulnerable`. Field order is
  กลุ่ม → ชื่อ-สกุล → เลขบัตร/เพศ → วันเกิด → บ้านเลขที่/ถนน → รหัสหมู่บ้าน/ชื่อหมู่บ้าน →
  **หน่วยบริการ/PID last**, because those two are the record key and normally arrive
  from picking a search result rather than being typed.
- The group `<select>` is `required` and starts on a `เลือกกลุ่ม` placeholder with
  `value=""` — no group is pre-selected, so the browser blocks the save until one is
  chosen.
- The ชื่อ-สกุล field is a search over the F43 `person` file joined to `home`
  (`GET /api/gis/person-search?q=`, 300ms debounce). It fires from **2 characters**
  and always gives feedback: results, `ไม่พบรายชื่อ`, or the error — never a silent
  empty box. Picking a result fills hospcode, pid, cid, ชื่อ-สกุล, เพศ, วันเกิด and
  the whole address in one go. `home` values of `"-"` or `"0"` mean "blank" in the
  raw file and are normalised away by `cleanText` instead of being filled in.
- HOME coverage is uneven: units that never imported the HOME file (e.g. hospcode
  `10676`, 52k persons, 0 home rows) return people with no address at all, while
  units that did import it resolve ~70-90%. Blank address fields are that, not a
  broken join.
- The search is limited to `typearea IN ('1','3')` (ประชากรในเขตรับผิดชอบ) and
  `discharge = '9'` (ยังไม่จำหน่าย). On the current data that cuts a `สม%` search
  from 3,371 rows to 589, so the 300-row scan window holds only eligible people.
- Only `person.name` is plaintext. `person.lname`, `person.cid_aes` and
  `home.house` are AES-256-GCM ciphertext written by the importer, so SQL filters
  on `p.name LIKE 'first%'` (up to 300 rows) and `webapp/lib/f43-decrypt.mjs`
  decrypts in Node (`SCAN_LIMIT` 300 rows, `RESULT_LIMIT` 20); a surname term then
  filters the decrypted `lname`. Searching by surname alone is therefore not
  supported — the placeholder says to type the given
  name first. `person.cid` itself is an MD5 hash and is never used here.
- `person.birth` is `YYYYMMDD` (converted to ISO) and `village_code` is assembled
  as `changwat + ampur + tambon + village`, each zero-padded to 2 digits. Many
  `person` rows have no matching `home` row, so the address fields often come back
  blank — that is data coverage, not a bug.
- The form is **centred in the map** (`top/left: 50%` + `translate(-50%, -50%)`)
  rather than anchored to the pin, so it can never run off an edge when the pin is
  dropped near a corner; `max-height: calc(100% - 24px)` with `overflow-y: auto`
  covers a map shorter than the form.
- The write POST and the name search are guarded by `requireGisAuth()`
  (`webapp/lib/gis-auth.mjs`), which **skips the check unless
  `NODE_ENV === "production"`** so `next dev` needs no login; the container runs
  `npm run start`, so production still requires it. The shared `requireAppAuth()`
  used by the rest of the app is untouched. Reading the map layers stays public in
  every environment. It validates hospcode/pid, an integer group,
  finite coordinates and the birth format before touching the DB, and upserts
  `ON CONFLICT (hospcode, pid)` so re-adding the same person edits the existing row
  instead of failing on the primary key. `ST_MakePoint` takes **(lng, lat)** in that
  order.
- After a successful save the layer's cached GeoJSON is dropped and its Leaflet
  layer removed so the toggle effect rebuilds it — otherwise the new pin would not
  appear until reload.

- `.gisMapWrap` carries `isolation: isolate` and `z-index: 0`. Leaflet's own layers
  go up to `z-index: 1000` (panes 400, controls 1000) while the header's menus sit
  at 30–80, so without that stacking context the map paints over the Add-On and
  user dropdowns. Keep any new map chrome inside `.gisMapWrap`.
- `ขอบเขตตำบล` reads `GET /api/gis/subdistrict-boundary`, which returns a GeoJSON
  FeatureCollection of `subdistrict_boundary` rows from PostGIS. The district is
  taken **only** from `.env` `AMP_CODE` (no query parameter):
  `districtBoundaryCode()` turns `6501` into the boundary code `TH6501`. With the
  current `AMP_CODE` that is 20 subdistricts of อ.เมืองพิษณุโลก.
- `webapp/lib/postgis.js` holds the `pg` pool. Its `globalThis` cache is keyed on
  the resolved config, so changing the GIS env does not leave a pool connected to
  the previous host — the plain `if (!cached)` form silently kept the old
  connection alive through dev hot reloads.
- Connection env (`GIS_DB_HOST`, `GIS_DB_PORT`, `GIS_DB_USER`, `GIS_DB_PASSWORD`,
  `GIS_DB_DATABASE`): `.env` points containers at the compose service name
  `postgis:5432`; `.env.local` overrides the host dev server to `localhost:5434`,
  the published port. `host.docker.internal` does **not** work from the host here
  — that address is firewalled for these ports.
- `webapp` deliberately has no `depends_on: postgis`. The connection is lazy, so a
  stopped PostGIS only breaks this one panel instead of holding back webapp start.

- The map starts centred on Phitsanulok (`[16.82, 100.26]`, zoom 9). Sizing and the
  layer-control skin live in `.gisMap` / `.gisMap .leaflet-control-layers` in
  `globals.css` — Leaflet needs an explicit container height.

### PostGIS container

- Service `postgis` / container `sub_hdc_postgis`, image `postgis/postgis:17-3.5`,
  volume `sub_hdc_postgis_data`. It is the spatial store for the GIS module and is
  separate from MariaDB — raw F43 files and the `s_*`/`t_*` transform tables stay
  where they are.
- DB `sub_hdc_gis`, user `postgres`, password `112233` (same local convention as
  MariaDB). Host port is **5434** (`5434:5432`) because 5432 and 5433 are already
  taken by other Postgres containers on the dev machine.
- The image's own initdb scripts create `postgis` and `postgis_topology` in
  `POSTGRES_DB` on first init. Do **not** bind-mount over the image's initdb
  directory — that masks those scripts and the extensions never get created.
  Verified: PostgreSQL 17.5 / PostGIS 3.5.2 with GEOS and PROJ.
- Nothing depends on it yet; `docker compose up -d postgis` starts it on its own.
- Focused test: `webapp/tests/docker-compose-migrations.test.mjs`.

#### `vulnerable` and `c_vulnerable`

- `vulnerable` is the person-level vulnerable-group registry with coordinates.
  Columns: `hospcode`, `pid`, `cid`, `fullname`, `sex`, `birth`, `vulnerable`,
  `addr_no`, `road`, `village_code` (8 digits), `village_name`,
  `geo_point geometry(Point, 4326)`. Primary key is `(hospcode, pid)`; btree
  indexes on `cid`, `vulnerable` and `village_code`, GiST on `geo_point`.
- `village_code` follows the F43 8-digit form: จังหวัด2 อำเภอ2 ตำบล2 หมู่2. The GET
  query resolves it to names by joining `subdistrict_boundary` on
  `sb.code = 'TH' || left(village_code, 6)` and returns `moo` (leading zero
  stripped), `tambon_name`, `district_name`, `province_name`. The popup renders
  those as `หมู่ที่ N ต.… อ.… จ.…`, falling back to the raw code when the join finds
  nothing. The POST rejects a `village_code` that is not exactly 8 digits.
- `c_vulnerable` is its lookup: `id`, `name`, `icon`, `is_active smallint NOT NULL
  DEFAULT 1` (same 1 = ใช้งาน / 0 = ยกเลิก meaning as the MariaDB `c_*` tables).
  Seeded with `1 = ผู้สูงอายุที่มีภาวะพึ่งพิง` (`hand-helping`),
  `2 = ผู้ป่วยติดเตียง` (`bed`), `3 = ผู้พิการ` (`accessibility`).
  `icon` names a key in `PIN_ICONS` in `components/gis-map.jsx`; a new type needs a
  code change only when it wants a glyph that registry does not have yet. `vulnerable.vulnerable` holds
  `c_vulnerable.id` as a **soft reference** — no foreign key, matching the rest of
  the schema.
- The lookup lives in PostGIS rather than beside the MariaDB `c_*` tables because
  the GIS API cannot join across the two databases.
- DDL: `migrate/postgis/20260828_create_vulnerable.sql`. The `migrate` container
  speaks MySQL only and does **not** run it — apply it by hand:

```powershell
docker exec -i sub_hdc_postgis psql -U postgres -d sub_hdc_gis -v ON_ERROR_STOP=1 --quiet < migrate/postgis/20260828_create_vulnerable.sql
```

  It is idempotent and non-destructive: `CREATE TABLE / INDEX IF NOT EXISTS`, an
  `ON CONFLICT` seed, and a guarded `DO` block that renames the earlier
  `vulnerable_person` / `group_name` names forward without dropping anything.
- The `vulnerable` table is created empty; no loader populates it yet. Demo rows for
  the map live in `migrate/postgis/sample/vulnerable_sample.sql` — 3 people per
  group (9 total), placed with `ST_PointOnSurface` of a subdistrict so every pin
  lands inside its own ตำบล, using the real รพ.สต. `hospcode` for that ตำบล. It is
  **not** schema: apply it only when sample data is wanted, and remove it with
  `DELETE FROM vulnerable WHERE pid LIKE 'SIM%';`.
- `GET /api/gis/vulnerable` returns rows with a non-null `geo_point` as GeoJSON
  points, joined to `c_vulnerable` for `vulnerable_name`. `?vulnerable=<id>`
  filters to one group and rejects a non-integer with 400. The join does not filter
  on `is_active`, so people carrying a retired code still appear on the map. It
  deliberately does **not** select or return `cid`, and casts `birth` with
  `to_char(..., 'YYYY-MM-DD')` because `pg` otherwise hands back a JS `Date` that
  shifts the day by the process timezone.

#### Boundary tables

- `public.district_boundary` (9 rows) and `public.subdistrict_boundary` (93 rows)
  were imported on 2026-08-28 from the separate `gis-postgis` container of the
  `E:\NextJS\gis` project (db `gis`, user `gis`). Both are
  `geometry(MultiPolygon, 4326)` and cover Phitsanulok only (`province_code`
  `TH65`); codes are `TH65NN` for districts and `TH65NNNN` for subdistricts.
  Primary keys, the `code` unique indexes, the GiST geometry indexes, and the id
  sequences came across with the dump.
- Re-run the import with:

```powershell
docker exec gis-postgis pg_dump -U gis -d gis --no-owner --no-privileges --no-comments --clean --if-exists -t public.district_boundary -t public.subdistrict_boundary > tmp/boundary_dump.sql
docker exec -i sub_hdc_postgis psql -U postgres -d sub_hdc_gis -v ON_ERROR_STOP=1 --quiet < tmp/boundary_dump.sql
```

- The dump is replayable (`--clean --if-exists` drops before recreating), but it
  is **not** in the repo — it is ~7.7 MB and currently lives only in the
  gitignored `tmp/`. The source is another project's container, so it is not a
  durable origin: commit the dump (or re-export the boundaries) before this data
  is needed on another host such as อ.เมือง.

## Ask AI menu

- The `Ask AI` main-tab entry was removed on 2026-08-28. `/ai/chat`, its API, and
  its breadcrumb entry are untouched — the page stays reachable by direct link.

## F43 importer: stalled `LOAD DATA` recovery

- `webapp/lib/import_f43_load_data.js` tracks byte activity from the
  `LOAD DATA LOCAL INFILE` source stream. If no bytes are read for
  `IMPORT_LOAD_INACTIVITY_TIMEOUT_MS` (default `900000`, 15 minutes), it destroys
  only that pooled DB connection and raises `ETIMEDOUT`.
- The importer daemon already classifies `ETIMEDOUT` as transient, returns the ZIP
  from `processing` to `queue`, resets the same `log_import_file` row to
  `pending`, and retries up to `IMPORT_MAX_REQUEUES` (default 3).
- The inactivity timer resets for every stream chunk and stops at EOF, so it does
  not kill a healthy long-running import or slow MySQL work after all bytes have
  been delivered.
- Keep `IMPORT_LOAD_NET_TIMEOUT=3600` and the two-hour
  `IMPORT_CHILD_TIMEOUT_MS` watchdog as outer safety limits. Do not lower the
  session network timeout to 600 seconds; a valid large table has previously
  exceeded that duration.
- Focused verification:
  `cd webapp; node --test tests/import-f43.test.mjs tests/import-daemon.test.mjs`.

## Failed import log retention

- Loading `/import-check/log-import` calls `POST /api/log-import/cleanup` before
  fetching the first table page. The shared `/dashboard/log-import` route does
  not trigger this cleanup.
- Cleanup deletes only `log_import_file` rows whose status is `not_complate` or
  legacy `no_complete` and whose `import_date_time` is strictly older than five
  days:
  `import_date_time < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY)`.
- Rows exactly five days old and all `pending`, `processing`, and `complete`
  rows are preserved.
- Focused verification:
  `cd webapp; node --test tests/log-import-cleanup.test.mjs tests/log-import-page.test.mjs`.

## ProviderID login

- `/login` keeps username/password and adds `เข้าสู่ระบบด้วย ProviderID` as the primary action.
- When no valid local callback URL is supplied, both sign-in methods redirect to `/import-check/compare-hdc-person`.
- Authentication starts at Health ID OAuth, returns to `/api/auth/healthid`, exchanges the Health ID token for a Provider ID token/profile, and creates an Auth.js JWT session.
- The protected-page `callbackUrl` is kept in the short-lived, httpOnly `provider_callback_url` cookie.
- First-time ProviderID users are inserted into `c_user_provider` with the active `user` role ID from `c_user_role`. Returning users refresh profile and `last_activity`; users with `is_active = 0` are denied.
- Required env names: `HEALTH_CLIENT_ID`, `HEALTH_CLIENT_SECRET`, `HEALTH_REDIRECT_URI`, `PROVIDER_CLIENT_ID`, `PROVIDER_CLIENT_SECRET`.

## Admin user management

- `/admin` is available only to the configured `.env` account or a ProviderID user with `c_user_provider.role = 1`; the API repeats the same authorization check.
- The configured username/password account receives the `admin` role. `c_user_provider.role` stores `c_user_role.id`, which is resolved to its role name for ProviderID sessions.
- `/api/admin/users` lists non-sensitive user fields and allows only `role_id`, `is_active`, and `note` updates. It never returns `cid_hash` or the saved profile.
- Administrators can hard-delete another ProviderID user after an explicit confirmation; they cannot delete their own ProviderID account.
- The user menu shows `Manage users` only for administrators.
- Role/status changes apply to the user's next login because ProviderID sessions are JWT-based with a 24-hour maximum age.
- `c_user_provider.login_count` starts at 1 on the first successful ProviderID login and increments on every later successful ProviderID login; `/admin` displays it as `LOGIN (ครั้ง)`.

มาตรฐานกลางของ**ทุกเพจ** — ไม่ผูกกับเพจใดเพจหนึ่ง

## Shell

- The app icon in the shared module header links to `/` (the landing page).

- ทุกโมดูลใช้ shell เดียวกันผ่าน `ModuleHeader` (โลโก้ + ชื่อระบบ + main tab +
  breadcrumb) — ไม่มี tab bar ชั้นที่สอง และ**ไม่มี hero/banner** ทุกหน้า
  เริ่มที่ `ModuleHeader` แล้วเข้าเนื้อหาเลย
- ทุกหน้า render `<ModuleHeader subtitle="..." />` บนสุดของ panel

## เส้นทาง

- legacy route redirect ถาวรใน `next.config.mjs` — ห้ามปล่อย route เก่า
  ตอบเนื้อหาซ้ำกับ route ใหม่
- หน้าเดียวกันที่โผล่หลาย path ใช้ re-export
  (`export { default } from "..."`) — แก้ที่ไฟล์ต้นทางไฟล์เดียว

## เพิ่มหน้า/โมดูลใหม่ต้องทำ 3 ที่

1. `webapp/components/main-tab.jsx` — ลำดับ tab = ลำดับ array `TABS`;
   โมดูลที่มีหน้าลูกต้องเพิ่มเงื่อนไข `startsWith` ให้ active state
2. `webapp/components/module-header.jsx` — เพิ่ม entry ใน
   `BREADCRUMB_MODULES` (path ที่ไม่อยู่ในลิสต์ไม่ crash แค่ไม่มี breadcrumb)
3. test — test เป็นแบบ read-source (regex กับไฟล์จริง) เพิ่ม/ย้ายหน้า
   ต้องอัปเดต test ที่อ้าง path/เนื้อหาเดิม

หน้า index ของโมดูลเป็นลิสต์เมนู `moduleTopicList` — ข้อความ bullet
สื่อความเดียวกับ subtitle ของหน้าปลายทาง (ไม่ต้องตรงคำต่อคำ) ทุก portal
แสดงเฉพาะหัวข้อด้วย `moduleTopicText` หนึ่งบรรทัด ห้ามมี title/description
สองชั้นหรือ `<small>` ใต้หัวข้อ และใช้ขนาดตัวอักษรมาตรฐาน 14px ทุก portal
โดยไม่สร้าง size modifier แยกรายหน้า

- รายการ topic bullet ทุก portal ใช้ `TopicBullet` ร่วมกัน โดยส่ง prop
  `href` และ `topic`; component เป็นเจ้าของ markup ของ bullet, ข้อความ และลูกศร
  เพื่อคงมาตรฐาน 14px น้ำหนักปกติ (400) ทุกชั้น

- `/target-group/kpi/dm-ht` breadcrumb ต้องมี 3 ระดับ:
  `กลุ่มเป้าหมาย` → `กลุ่มเป้าหมายตามตัวชี้วัด` → `จำนวนผู้ป่วย DM/HT`;
  สองระดับแรกต้องเป็นลิงก์กลับไปยังหน้าดัชนีของแต่ละระดับ
- Breadcrumb ใช้ component ร่วม `Breadcrumb` โดยส่ง prop `items` เป็น array ของ
  `{ href?, label }`; `module-header.jsx` รับผิดชอบเฉพาะการแปลง route เป็น items;
  ข้อความ breadcrumb ทุกระดับใช้ขนาด 15px

## แบบแผน UI (ตกลงกับ user แล้ว — ต้องทำตาม)

- **ห้ามมี label เกินจำเป็น** — filter control ไม่มี visible label ใช้
  placeholder หรือ default option ที่สื่อความหมายแทน (ใส่
  `<span className="srOnly">` เพื่อ accessibility); subtitle/หัวคอลัมน์/
  ข้อความ meta สั้นพอสื่อความหมาย ไม่อธิบายซ้ำกับสิ่งที่ UI สื่ออยู่แล้ว
- **คอลัมน์หน่วยบริการ**: รหัสนำหน้า ตามด้วยชื่อย่อใน
  `<span className="hospNameShort">` บรรทัดเดียว — ชื่อย่อจาก
  `getHospNameMap` (`c_hospital.hospname_short`)
- **คอลัมน์ตัวเลขสำคัญแยกสี**: กำหนดเป็นคู่ class `<ชื่อ>Header/<ชื่อ>Cell`
  ใน `globals.css` ใช้ทั้ง `<th>` และ `<td>` เสมอ
- **stat cards**: `statGrid` + `statCard` (icon/value/label) แสดง "…"
  ระหว่างโหลด
- **datagrid header label**: ป้ายบอกที่มา/เวลาของข้อมูลเหนือตาราง —
  บรรทัดเดียวชิดขวา ตัวเล็กจาง (font 11px น้ำหนักปกติ สี `var(--muted)`)
  มี icon lucide เล็ก (13px) นำหน้า สื่อความหมายของข้อมูล เช่น `RefreshCw`
  สำหรับเวลา sync/ประมวลผล; ระหว่างโหลดแสดง "…" — ต้นแบบ:
  `.compareHdcSyncMeta` (หน้า `/import-check/compare-hdc-person`)
- **ตารางแบบ group คอลัมน์** (หลายค่าใต้หัวข้อเดียว เช่น HDC/SUB-HDC/ส่วนต่าง
  ต่อ type): thead 2 ชั้น — ชั้นแรกคอลัมน์คงที่ใช้ `rowSpan={2}` + หัวกลุ่ม
  `colSpan` ชั้นสองเป็นคอลัมน์ย่อย; คั่นกลุ่มด้วยเส้นซ้าย
  (`border-left` บนหัวกลุ่มและคอลัมน์แรกของกลุ่ม เช่น
  `compareGroupHeader`/`compareGroupCol`); กลุ่มสำคัญเน้นด้วยคู่ class
  `<ชื่อ>Header/<ชื่อ>Cell` ตามข้อบน กลุ่มรองกดให้เล็กและจางด้วย class
  เดียวทั้ง th/td (เช่น `compareDimCol`)
- **ส่งออก xlsx ราย row**: หัวคอลัมน์ "รายชื่อแบบปกปิด" + icon
  `FileSpreadsheet` (class `exportXlsxLink`) ลิงก์ตรงไป API export —
  endpoint ต้อง login ไม่งั้น redirect ไป `/error/msg`
  (ดู @handoff/hand-off-err.md) และห้ามส่งออกคอลัมน์ `cid`

## โครงหน้าตารางมาตรฐาน

`ModuleHeader` → `statGrid` → toolbar (ค้นหา + ปุ่มรีเฟรช) → `tableMeta`
(+ "Transform ล่าสุด" จาก `log_transform`) → `tableWrap > fileTable`

data flow: page (client) → `fetch("/api/...", { cache: "no-store" })` →
API route อ่าน**ตารางสรุปของ transform** (ไม่ query ตารางดิบ) — หน้าใหม่
ควรมี API + ตารางสรุปของตัวเอง ดู @handoff/hand-off-transform.md

## Work Load

- `/workload/visit-monthly` reads `s_visit` at
  `hospcode + fiscal_year + month` grain and shows both `visit_person` (คน)
  and `visit_count` (ครั้ง) for each fiscal month.
- `/workload/ncdscreen-workload` filters every displayed topic (DM and HT),
  summary, and monthly trend by `สังกัด`. The affiliation lookup comes from
  `c_hostype.hostype_name` joined through `c_hospital.hostype_new`, with
  `c_hospital.dep_name` as fallback.
- Every Work Load datagrid has a top-right `ส่งออก Excel` action. Export routes
  reuse the same filtered API handlers, so fiscal year, affiliation, hospital,
  and the active NCD metric match the visible grid. Visit exports contain both
  คน and ครั้ง columns for each fiscal month.

## การทดสอบ

```powershell
cd webapp
node --test tests\*.test.mjs
```

## Root landing page

- `/` uses the standard `main dashboardMain > panel panelWide dashboardPanel > ModuleHeader` shell.
- The page body presents four cards without a separate content heading: quality checking, target registry, gap tracking, and performance summary.
- The introduction uses `webapp/public/ai.png` as a responsive supporting visual.
- Keep the cards in a 2x2 grid before the AI image on desktop and one column on mobile.
- Focused source test: `webapp/tests/landing-page.test.mjs`.
