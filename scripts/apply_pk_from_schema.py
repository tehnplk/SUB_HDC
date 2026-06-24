from pathlib import Path

import pymysql

from import_f43 import load_env


PK_SCHEMA = {
    "PERSON": ["HOSPCODE", "PID", "HOSPCODE9"],
    "ADDRESS": ["HOSPCODE", "PID", "ADDRESSTYPE", "HOSPCODE9"],
    "DEATH": ["HOSPCODE", "PID", "HOSPCODE9", "HOSP9_DEATH"],
    "CHRONIC": ["HOSPCODE", "PID", "DATE_DIAG", "CHRONIC", "HOSPCODE9"],
    "CARD": ["HOSPCODE", "PID", "INSTYPE_NEW", "HOSPCODE9"],
    "HOME": ["HOSPCODE", "HID", "HOSPCODE9"],
    "VILLAGE": ["HOSPCODE", "VID", "HOSPCODE9"],
    "DISABILITY": ["HOSPCODE", "PID", "DISABTYPE", "HOSPCODE9"],
    "PROVIDER": ["HOSPCODE", "PROVIDER", "HOSPCODE9"],
    "WOMEN": ["HOSPCODE", "PID", "HOSPCODE9"],
    "DRUGALLERGY": ["HOSPCODE", "PID", "DRUGALLERGY", "HOSPCODE9"],
    "FUNCTIONAL": ["HOSPCODE", "PID", "SEQ", "FUNCTIONAL_TEST", "HOSPCODE9"],
    "ICF": ["HOSPCODE", "PID", "SEQ", "ICF", "HOSPCODE9"],
    "SERVICE": ["HOSPCODE", "SEQ", "DATE_SERV", "HOSPCODE9"],
    "DIAGNOSIS_OPD": ["HOSPCODE", "PID", "SEQ", "DATE_SERV", "DIAGCODE", "HOSPCODE9"],
    "DRUG_OPD": ["HOSPCODE", "PID", "SEQ", "DATE_SERV", "DIDSTD", "HOSPCODE9"],
    "PROCEDURE_OPD": ["HOSPCODE", "PID", "SEQ", "DATE_SERV", "PROCEDCODE", "HOSPCODE9"],
    "CHARGE_OPD": ["HOSPCODE", "PID", "SEQ", "DATE_SERV", "CHARGEITEM", "CHARGELIST", "INSTYPE", "HOSPCODE9"],
    "SURVEILLANCE": ["HOSPCODE", "PID", "SEQ", "DIAGCODE", "HOSPCODE9"],
    "ACCIDENT": ["HOSPCODE", "PID", "SEQ", "DATETIME_SERV", "HOSPCODE9"],
    "LABFU": ["HOSPCODE", "PID", "DATE_SERV", "LABTEST", "HOSPCODE9"],
    "CHRONICFU": ["HOSPCODE", "PID", "DATE_SERV", "HOSPCODE9"],
    "ADMISSION": ["HOSPCODE", "PID", "AN", "DATETIME_DISCH", "HOSPCODE9"],
    "DIAGNOSIS_IPD": ["HOSPCODE", "PID", "AN", "DATETIME_ADMIT", "DIAGCODE", "HOSPCODE9"],
    "DRUG_IPD": ["HOSPCODE", "PID", "AN", "DATETIME_ADMIT", "TYPEDRUG", "DIDSTD", "HOSPCODE9"],
    "PROCEDURE_IPD": ["HOSPCODE", "PID", "AN", "DATETIME_ADMIT", "PROCEDCODE", "TIMESTART", "HOSPCODE9"],
    "CHARGE_IPD": ["HOSPCODE", "PID", "AN", "DATETIME_ADMIT", "CHARGEITEM", "CHARGELIST", "INSTYPE", "HOSPCODE9"],
    "APPOINTMENT": ["HOSPCODE", "PID", "SEQ", "DATE_SERV", "APTYPE", "HOSPCODE9"],
    "DENTAL": ["HOSPCODE", "PID", "SEQ", "DATE_SERV", "HOSPCODE9"],
    "REHABILITATION": ["HOSPCODE", "PID", "DATE_SERV", "REHABCODE", "HOSPCODE9"],
    "NCDSCREEN": ["HOSPCODE", "PID", "DATE_SERV", "HOSPCODE9"],
    "FP": ["HOSPCODE", "PID", "DATE_SERV", "FPTYPE", "HOSPCODE9"],
    "PRENATAL": ["HOSPCODE", "PID", "GRAVIDA", "HOSPCODE9"],
    "ANC": ["HOSPCODE", "PID", "DATE_SERV", "HOSPCODE9"],
    "LABOR": ["HOSPCODE", "PID", "GRAVIDA", "BDATE", "HOSPCODE9"],
    "POSTNATAL": ["HOSPCODE", "PID", "GRAVIDA", "PPCARE", "HOSPCODE9"],
    "NEWBORN": ["HOSPCODE", "PID", "BDATE", "HOSPCODE9"],
    "NEWBORNCARE": ["HOSPCODE", "PID", "BCARE", "HOSPCODE9"],
    "EPI": ["HOSPCODE", "PID", "DATE_SERV", "VACCINETYPE", "HOSPCODE9"],
    "NUTRITION": ["HOSPCODE", "PID", "DATE_SERV", "HOSPCODE9"],
    "SPECIALPP": ["HOSPCODE", "PID", "DATE_SERV", "PPSPECIAL", "HOSPCODE9"],
    "COMMUNITY_ACTIVITY": ["HOSPCODE", "VID", "DATE_START", "COMACTIVITY", "HOSPCODE9"],
    "COMMUNITY_SERVICE": ["HOSPCODE", "PID", "SEQ", "COMSERVICE", "HOSPCODE9"],
    "CARE_REFER": ["HOSPCODE", "REFERID", "CARETYPE", "HOSPCODE9"],
    "CLINICAL_REFER": ["HOSPCODE", "REFERID", "DATETIME_ASSESS", "CLINICALCODE", "HOSPCODE9"],
    "DRUG_REFER": ["HOSPCODE", "REFERID", "DATETIME_DSTART", "DIDSTD", "HOSPCODE9"],
    "INVESTIGATION_REFER": ["HOSPCODE", "REFERID", "DATETIME_INVEST", "INVESTCODE", "HOSPCODE9"],
    "PROCEDURE_REFER": ["HOSPCODE", "REFERID", "TIMESTART", "PROCEDCODE", "HOSPCODE9"],
    "REFER_HISTORY": ["HOSPCODE", "REFERID", "HOSPCODE9"],
    "REFER_RESULT": ["HOSPCODE", "REFERID_SOURCE", "HOSP_SOURCE", "HOSPCODE9", "HOSP9_SOURCE"],
    "DATA_CORRECT": ["D_UPDATE"],
    "POLICY": [],
}

PK_WIDTHS = {
    "ADDRESSTYPE": 1,
    "AN": 9,
    "APTYPE": 3,
    "BCARE": 8,
    "BDATE": 8,
    "CARETYPE": 1,
    "CHARGEITEM": 2,
    "CHARGELIST": 6,
    "CHRONIC": 6,
    "CLINICALCODE": 6,
    "COMACTIVITY": 7,
    "COMSERVICE": 7,
    "DATETIME_ADMIT": 14,
    "DATETIME_ASSESS": 14,
    "DATETIME_DISCH": 14,
    "DATETIME_DSTART": 14,
    "DATETIME_INVEST": 14,
    "DATETIME_SERV": 14,
    "DATE_DIAG": 8,
    "DATE_SERV": 8,
    "DATE_START": 8,
    "DIAGCODE": 6,
    "DIDSTD": 24,
    "DISABTYPE": 1,
    "DRUGALLERGY": 24,
    "D_UPDATE": 14,
    "FPTYPE": 1,
    "FUNCTIONAL_TEST": 2,
    "GRAVIDA": 2,
    "HID": 14,
    "HOSPCODE": 5,
    "HOSPCODE9": 9,
    "HOSP9_DEATH": 9,
    "HOSP9_SOURCE": 9,
    "HOSP_SOURCE": 5,
    "ICF": 6,
    "INSTYPE": 4,
    "INSTYPE_NEW": 4,
    "INVESTCODE": 6,
    "LABTEST": 7,
    "PID": 15,
    "PPCARE": 8,
    "PPSPECIAL": 6,
    "PROCEDCODE": 7,
    "PROVIDER": 15,
    "REFERID": 10,
    "REFERID_SOURCE": 10,
    "REHABCODE": 7,
    "SEQ": 16,
    "TIMESTART": 14,
    "TYPEDRUG": 1,
    "VACCINETYPE": 3,
    "VID": 8,
}


def qi(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


def existing_columns(cursor, database: str, table: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema=%s AND table_name=%s
        """,
        (database, table),
    )
    return {row[0] for row in cursor.fetchall()}


def has_primary_key(cursor, database: str, table: str) -> bool:
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.table_constraints
        WHERE table_schema=%s AND table_name=%s AND constraint_type='PRIMARY KEY'
        """,
        (database, table),
    )
    return cursor.fetchone()[0] > 0


def count_rows(cursor, table: str) -> int:
    cursor.execute(f"SELECT COUNT(*) FROM {qi(table)}")
    return cursor.fetchone()[0]


def has_null_or_blank(cursor, table: str, columns: list[str]) -> bool:
    checks = " OR ".join(f"{qi(col)} IS NULL OR {qi(col)} = ''" for col in columns)
    cursor.execute(f"SELECT 1 FROM {qi(table)} WHERE {checks} LIMIT 1")
    return cursor.fetchone() is not None


def has_duplicate_key(cursor, table: str, columns: list[str]) -> bool:
    group_cols = ", ".join(qi(col) for col in columns)
    cursor.execute(
        f"SELECT 1 FROM {qi(table)} GROUP BY {group_cols} HAVING COUNT(*) > 1 LIMIT 1"
    )
    return cursor.fetchone() is not None


def apply_primary_key(cursor, table: str, columns: list[str]) -> None:
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

    created = []
    skipped = []
    try:
        with conn.cursor() as cursor:
            for table, schema_columns in PK_SCHEMA.items():
                columns = existing_columns(cursor, database, table)
                if not columns:
                    skipped.append((table, "missing_table", ",".join(schema_columns)))
                    continue
                if has_primary_key(cursor, database, table):
                    skipped.append((table, "already_has_pk", ",".join(schema_columns)))
                    continue

                usable_columns = [col for col in schema_columns if col in columns]
                missing_columns = [col for col in schema_columns if col not in columns]

                if not usable_columns:
                    skipped.append((table, "no_existing_pk_columns", ",".join(missing_columns)))
                    continue

                rows = count_rows(cursor, table)
                if rows and has_null_or_blank(cursor, table, usable_columns):
                    skipped.append((table, "null_or_blank_key", ",".join(usable_columns)))
                    continue
                if rows and has_duplicate_key(cursor, table, usable_columns):
                    skipped.append((table, "duplicate_key", ",".join(usable_columns)))
                    continue

                try:
                    apply_primary_key(cursor, table, usable_columns)
                except pymysql.MySQLError as exc:
                    skipped.append((table, f"alter_error_{exc.args[0]}", str(exc.args[1])))
                    continue
                created.append((table, ",".join(usable_columns), ",".join(missing_columns)))
    finally:
        conn.close()

    print("created_table|pk_columns|schema_pk_missing_columns")
    for row in created:
        print("|".join(row))
    print("skipped_table|reason|columns")
    for row in skipped:
        print("|".join(row))


if __name__ == "__main__":
    main()
