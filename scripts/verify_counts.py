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
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema=%s ORDER BY table_name",
                (database,),
            )
            tables = [row[0] for row in cursor.fetchall()]

            print("table|rows")
            total = 0
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
                count = cursor.fetchone()[0]
                total += count
                print(f"{table}|{count}")
            print(f"TOTAL|{total}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
