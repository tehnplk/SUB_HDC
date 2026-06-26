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