## RULE
- Do not commit , build , deploy if user not request.

## Research Tool
- npx  ctx7 cli  skill

## Database manipulate tool
- use `db-cli` skill for manipulate database.
- read @.env  for database credentials.
- Never delete any data in tabel `c_file`
- table name in c_file table  is  main data table

## testing/investigate by browser
- use `playwright-cli` skill for testing or investigate
- Always run cmd `playwright-cli show` when start browser
- Run cmd `playwright-cli show --anotate` when user ask to anotate and wait for user done anotation.
- If you confuse for this tool  run `playwright-cli --help` to get knowleadge.

### anotate step
```
playwright-cli open http://localhost:3000
playwright-cli show
playwright-cli show --annotate

```
## bump version
- edit @wepapp/update_log.json
- post version payload to https://subhdc.plkhealth.go.th/api/sub-version


## Sync Data to center
- post to https://subhdc.plkhealth.go.th/api/data-sync-in
- payload 
```json
{
  "sub_center_name": "อ.เมือง",
  "hospcode": "10731",
  "data_type": "person",
  "rows": [
    { "cid": "3100500123456", "name": "สมชาย ใจดี" },
    { "cid": "3650100654321", "name": "สมหญิง มีสุข" }
  ]
}

```
- response
```json
{ "success": true, "id": 3, "date_time_sync": "2026-07-06T03:10:00.000Z" }

```

## Handoff
 - you must update @handoff/HANDOFF.md  if user  request.