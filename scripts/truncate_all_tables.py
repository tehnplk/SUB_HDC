from pathlib import Path

import pymysql

from import_f43 import load_env


def qi(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


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
        autocommit=True,
    )

    truncated = []
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = sorted(row[0] for row in cursor.fetchall())
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            try:
                for table in tables:
                    cursor.execute(f"TRUNCATE TABLE {qi(table)}")
                    truncated.append(table)
            finally:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    finally:
        conn.close()

    print(f"truncated_tables|{len(truncated)}")
    for table in truncated:
        print(table)


if __name__ == "__main__":
    main()
