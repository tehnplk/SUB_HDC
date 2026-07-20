## About Repo
- Health Data Center  , Dashboard and Health Data Analysis
- Get raw  data from  `ข้อมูล 43 แฟ้มตามมาตรฐานโครงสร้างกระทรวงสาธารณสุข`

## dataset  schema  and its master data of  43 filse standard structure
- 43 files schema  at directory @43tables_schema
- use `nlm` cli to retieve its lookup from book  id `a61caa4a-17dd-457f-ab23-f3a65f51ed53`
- use `db-cli` to get live master data from c_{master_table_name}

## Request HDC OPEN-DATA API

- read  @handoff/hand-off-hdc-api.md.

## RULE
- Spawn Sub-agent who set for topic that user request first.
- Do not commit , build , deploy if user not request.
- new Database table  must use collation  only utf8mb3_general_ci.
- If the user misspells a word, briefly state the correct spelling before proceeding.

## Research Tool
- Use `npx ctx7` CLI for technical research.
- Use the `nlm` CLI for knowledge research.

## Database manipulate tool
- when have to retieve  or manipulate  data from databse with sql command spawn sub-agent  name 'sql-expert'

## testing/investigate by browser
- use `playwright-cli` skill for testing or investigate
- Always run cmd `playwright-cli show` when start browser
- Run cmd `playwright-cli show --anotate` when user ask to anotate and wait for user done anotation.
- If you confuse for this tool  run `playwright-cli --help` to get knowleadge.

### anotate step
```
playwright-cli open `http://localhost:3000`
playwright-cli show
playwright-cli show --annotate

```
## bump version
- edit @wepapp/update_log.json
- ถ้าตัวสุดท้ายเป็น 9 ให้ +1 ให้ตัวที่สอง และตัวสุดท้ายเป็น 1  เช่น  1.0.9 -> 1.1.1
- post version payload to `https://subhdc.plkhealth.go.th/api/sub-version`

## Sync Data to center
- endpoint/secret ของ center อ่านจาก `webapp/.env` (กลุ่ม SYNC: `SSJ_BASE_URL`, `SSJ_ENDPOINT_GET_SQL`, `SSJ_ENDPOINT_POST`, `SSJ_SYNC_SECRET`)
- รายละเอียดระบบ sync ดู @handoff/hand-off-sync.md

## Handoff
 - handoff docs แยกตามระบบ: @handoff/hand-off-sync.md , @handoff/hand-off-migrate.md , @handoff/hand-off-err.md , @handoff/hand-off-transform.md , @handoff/hand-off-webapp-ui-flow.md , @handoff/hand-off-addon-auth.md
 - you must update handoff doc ของระบบที่เกี่ยวข้อง if user request.

## deploy to อ.เมือง
- spawn sub-agent name 'deploy-mueng'

 ## When done the task
 - just say `I have done.`  
 - Don't explain too much.
 - Summarize it as briefly as possible.
