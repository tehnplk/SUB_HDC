from __future__ import annotations

import argparse
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pymysql


IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_]+$")


@dataclass
class F43File:
    table_name: str
    columns: list[str]
    rows: list[list[str]]


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def quote_identifier(name: str) -> str:
    if not name or not IDENTIFIER_RE.match(name):
        raise ValueError(f"Invalid MySQL identifier: {name!r}")
    return f"`{name}`"


def build_create_table_sql(table_name: str, columns: list[str]) -> str:
    quoted_table = quote_identifier(table_name)
    column_sql = ", ".join(f"{quote_identifier(column)} varchar(255) NULL" for column in columns)
    return (
        f"CREATE TABLE {quoted_table} ({column_sql}) "
        "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
    )


def decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "cp874"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8-sig", errors="replace")


def read_f43_files(zip_path: Path) -> Iterable[F43File]:
    with zipfile.ZipFile(zip_path) as archive:
        names = sorted(name for name in archive.namelist() if name.lower().endswith(".txt"))
        for name in names:
            text = decode_text(archive.read(name))
            lines = text.splitlines()
            if not lines:
                raise ValueError(f"Missing header in {name}")

            columns = lines[0].split("|")
            if any(not column for column in columns):
                raise ValueError(f"Blank column name in {name}")

            rows: list[list[str]] = []
            for line_no, line in enumerate(lines[1:], start=2):
                if not line:
                    continue
                row = line.split("|")
                if len(row) != len(columns):
                    raise ValueError(
                        f"Column count mismatch in {name} line {line_no}: "
                        f"expected {len(columns)}, got {len(row)}"
                    )
                rows.append(row)

            yield F43File(
                table_name=Path(name).stem,
                columns=columns,
                rows=rows,
            )


def connect(host: str, port: int, user: str, password: str, database: str | None = None):
    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        autocommit=False,
    )


def ensure_database(host: str, port: int, user: str, password: str, database: str) -> None:
    with connect(host, port, user, password) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS {quote_identifier(database)} "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
            )
        conn.commit()


def import_file(cursor, f43_file: F43File, batch_size: int) -> int:
    table_sql = quote_identifier(f43_file.table_name)
    cursor.execute(f"DROP TABLE IF EXISTS {table_sql}")
    cursor.execute(build_create_table_sql(f43_file.table_name, f43_file.columns))

    if not f43_file.rows:
        return 0

    column_sql = ", ".join(quote_identifier(column) for column in f43_file.columns)
    placeholders = ", ".join(["%s"] * len(f43_file.columns))
    insert_sql = f"INSERT INTO {table_sql} ({column_sql}) VALUES ({placeholders})"

    imported = 0
    for start in range(0, len(f43_file.rows), batch_size):
        batch = f43_file.rows[start : start + batch_size]
        cursor.executemany(insert_sql, batch)
        imported += len(batch)
    return imported


def import_zip(zip_path: Path, host: str, port: int, user: str, password: str, database: str, batch_size: int) -> list[dict]:
    ensure_database(host, port, user, password, database)
    summary: list[dict] = []

    with connect(host, port, user, password, database) as conn:
        try:
            with conn.cursor() as cursor:
                for f43_file in read_f43_files(zip_path):
                    imported = import_file(cursor, f43_file, batch_size)
                    summary.append(
                        {
                            "table": f43_file.table_name,
                            "columns": len(f43_file.columns),
                            "rows": imported,
                        }
                    )
                    print(f"{f43_file.table_name}: {imported} rows")
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    return summary


def parse_args() -> argparse.Namespace:
    env = load_env(Path(".env"))
    parser = argparse.ArgumentParser(description="Import F43 pipe-delimited text files from a zip into MySQL.")
    parser.add_argument("--zip", default="upload/F43_11251_20260501163101.zip")
    parser.add_argument("--host", default=env.get("HOST", "localhost"))
    parser.add_argument("--port", type=int, default=int(env.get("PORT", "3306")))
    parser.add_argument("--user", default=env.get("USER", "root"))
    parser.add_argument("--password", default=env.get("PASSWORD", ""))
    parser.add_argument("--database", default=env.get("DATABASE", "sub_hdc"))
    parser.add_argument("--batch-size", type=int, default=1000)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary = import_zip(
        zip_path=Path(args.zip),
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.database,
        batch_size=args.batch_size,
    )

    print("\nSummary")
    print("table|columns|rows")
    for item in sorted(summary, key=lambda row: row["table"]):
        print(f"{item['table']}|{item['columns']}|{item['rows']}")


if __name__ == "__main__":
    main()
