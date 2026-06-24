from pathlib import Path

import pymysql

from import_f43 import load_env


def qi(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


def main() -> None:
    env = load_env(Path(".env"))
    database = env.get("DATABASE", "sub_hdc")
    zip_name = "F43_11251_20260501163101.zip"
    conn = pymysql.connect(
        host=env.get("HOST", "localhost"),
        port=int(env.get("PORT", "3306")),
        user=env.get("USER", "root"),
        password=env.get("PASSWORD", ""),
        database=database,
        charset="utf8mb4",
    )
    wrong = []
    total = 0
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = sorted(row[0] for row in cursor.fetchall())
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {qi(table)}")
                total += cursor.fetchone()[0]
                cursor.execute(
                    f"SELECT COUNT(*) FROM {qi(table)} "
                    "WHERE FILE_NAME IS NOT NULL AND FILE_NAME <> %s",
                    (zip_name,),
                )
                count = cursor.fetchone()[0]
                if count:
                    wrong.append((table, count))
    finally:
        conn.close()

    print(f"total_rows|{total}")
    print(f"wrong_file_name_rows|{sum(count for _, count in wrong)}")
    for table, count in wrong:
        print(f"{table}|{count}")


if __name__ == "__main__":
    main()
