# HDC Open Data API Guide


Base URL:

```text
https://opendata.moph.go.th/api
```

| Step | Method | Endpoint | Input หลัก |
|---|---|---|---|
| Category | `GET` | `/category` | ไม่มี |
| Reports in category | `GET` | `/report/{cat_id}` | `cat_id` |
| Report name by table | `GET` | `/report_name/{source_table}` | `source_table` |
| Report schema | `GET` | `/report_schema/{source_table}` | `source_table` |
| Report data | `POST` | `/report_data` | `tableName`, `year`, `province`, `type` |

## Example payload for POST /report_data

```json

{
    "tableName": "s_childdev_specialpp",
    "year": "2569",
    "province": "65",
    "type": "json"
  }

```
