from pathlib import Path

import pymysql

from import_f43 import load_env


def main() -> None:
    env = load_env(Path(".env"))
    database = env.get("DATABASE", "sub_hdc")
    conn = pymysql.connect(
        host=env.get("HOST", "localhost"),
        port=int(env.get("PORT", "3306")),
        user=env.get("USER", "root"),
        password=env.get("PASSWORD", ""),
        database=database,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = sorted(row[0] for row in cursor.fetchall())
            rows = []
            for table in tables:
                cursor.execute(f"SHOW KEYS FROM `{table}` WHERE Key_name = 'PRIMARY'")
                if not cursor.fetchone():
                    rows.append(table)
    finally:
        conn.close()

    print(f"tables_without_pk|{len(rows)}")
    for table in rows:
        print(table)


if __name__ == "__main__":
    main()
