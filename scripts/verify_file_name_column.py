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
            missing = []
            for table in tables:
                cursor.execute(
                    """
                    SELECT column_type
                    FROM information_schema.columns
                    WHERE table_schema = %s
                      AND table_name = %s
                      AND column_name = 'FILE_NAME'
                    """,
                    (database, table),
                )
                row = cursor.fetchone()
                if not row or row[0].lower() != "varchar(255)":
                    missing.append(table)
    finally:
        conn.close()

    print(f"total_tables|{len(tables)}")
    print(f"tables_with_file_name|{len(tables) - len(missing)}")
    print(f"missing_or_wrong_type|{len(missing)}")
    for table in missing:
        print(table)


if __name__ == "__main__":
    main()
