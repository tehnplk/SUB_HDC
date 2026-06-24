from pathlib import Path

import pymysql

from apply_pk_from_schema import PK_SCHEMA, PK_WIDTHS, qi
from import_f43 import load_env


IGNORE_PK_COLUMNS = {"HOSPCODE9"}


def table_names(cursor) -> list[str]:
    cursor.execute("SHOW TABLES")
    return sorted(row[0] for row in cursor.fetchall())


def existing_columns(cursor, database: str, table: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        """,
        (database, table),
    )
    return {row[0] for row in cursor.fetchall()}


def has_primary_key(cursor, database: str, table: str) -> bool:
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.table_constraints
        WHERE table_schema = %s
          AND table_name = %s
          AND constraint_type = 'PRIMARY KEY'
        """,
        (database, table),
    )
    return cursor.fetchone()[0] > 0


def drop_primary_key(cursor, database: str, table: str) -> bool:
    if not has_primary_key(cursor, database, table):
        return False
    cursor.execute(f"ALTER TABLE {qi(table)} DROP PRIMARY KEY")
    return True


def truncate_table(cursor, table: str) -> None:
    cursor.execute(f"TRUNCATE TABLE {qi(table)}")


def add_primary_key(cursor, table: str, columns: list[str]) -> None:
    modify_cols = ", ".join(
        f"MODIFY {qi(col)} varchar({PK_WIDTHS.get(col, 255)}) NOT NULL"
        for col in columns
    )
    pk_cols = ", ".join(qi(col) for col in columns)
    cursor.execute(f"ALTER TABLE {qi(table)} {modify_cols}, ADD PRIMARY KEY ({pk_cols})")


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
    dropped_pk = []
    created_pk = []
    skipped_pk = []

    try:
        with conn.cursor() as cursor:
            tables = table_names(cursor)
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            try:
                for table in tables:
                    truncate_table(cursor, table)
                    truncated.append(table)

                for table in tables:
                    if drop_primary_key(cursor, database, table):
                        dropped_pk.append(table)

                for table, schema_columns in PK_SCHEMA.items():
                    if table not in tables:
                        skipped_pk.append((table, "missing_table", ""))
                        continue

                    table_columns = existing_columns(cursor, database, table)
                    pk_columns = [
                        col
                        for col in schema_columns
                        if col not in IGNORE_PK_COLUMNS and col in table_columns
                    ]
                    missing_columns = [
                        col
                        for col in schema_columns
                        if col not in IGNORE_PK_COLUMNS and col not in table_columns
                    ]

                    if not pk_columns:
                        skipped_pk.append((table, "no_existing_pk_columns", ",".join(missing_columns)))
                        continue

                    add_primary_key(cursor, table, pk_columns)
                    created_pk.append((table, ",".join(pk_columns), ",".join(missing_columns)))
            finally:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    finally:
        conn.close()

    print(f"truncated_tables|{len(truncated)}")
    print(f"dropped_primary_keys|{len(dropped_pk)}")
    print("created_table|pk_columns|schema_pk_missing_columns")
    for row in created_pk:
        print("|".join(row))
    print("skipped_table|reason|columns")
    for row in skipped_pk:
        print("|".join(row))


if __name__ == "__main__":
    main()
