from pathlib import Path

import pymysql

from import_f43 import load_env


IGNORED_PK_COLUMNS = {"HOSPCODE9"}

SHEET_PK = {
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


def db_pk_columns(cursor, database: str, table: str) -> list[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = %s
          AND table_name = %s
          AND constraint_name = 'PRIMARY'
        ORDER BY ordinal_position
        """,
        (database, table),
    )
    return [row[0] for row in cursor.fetchall()]


def db_columns(cursor, database: str, table: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        """,
        (database, table),
    )
    return {row[0] for row in cursor.fetchall()}


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

    rows = []
    try:
        with conn.cursor() as cursor:
            for table, sheet_pk in SHEET_PK.items():
                expected = [col for col in sheet_pk if col not in IGNORED_PK_COLUMNS]
                columns = db_columns(cursor, database, table)
                expected_existing = [col for col in expected if col in columns]
                missing_sheet_pk_cols = [col for col in expected if col not in columns]
                actual = db_pk_columns(cursor, database, table)

                if missing_sheet_pk_cols:
                    status = "MISSING_PK_COLUMN_IN_DB"
                elif actual == expected_existing:
                    status = "OK"
                else:
                    status = "MISMATCH"
                if not expected:
                    status = "OK_NO_PK_IN_SHEET" if not actual else "MISMATCH"

                rows.append(
                    (
                        table,
                        ",".join(expected),
                        ",".join(actual),
                        ",".join(missing_sheet_pk_cols),
                        status,
                    )
                )
    finally:
        conn.close()

    out = Path("pk_verify_against_sheet.tsv")
    with out.open("w", encoding="utf-8", newline="") as file:
        file.write("table\tsheet_pk_without_hospcode9\tdb_pk\tmissing_sheet_pk_columns_in_db\tstatus\n")
        for row in rows:
            file.write("\t".join(row) + "\n")

    ok = sum(1 for row in rows if row[4].startswith("OK"))
    missing = sum(1 for row in rows if row[4] == "MISSING_PK_COLUMN_IN_DB")
    mismatch = sum(1 for row in rows if row[4] == "MISMATCH")
    print(f"verified_tables|{len(rows)}")
    print(f"ok|{ok}")
    print(f"missing_pk_column_in_db|{missing}")
    print(f"mismatch|{mismatch}")
    print(f"report|{out}")
    if missing or mismatch:
        print("issue_table|sheet_pk_without_hospcode9|db_pk|missing_sheet_pk_columns_in_db|status")
        for table, expected, actual, missing, status in rows:
            if status in {"MISSING_PK_COLUMN_IN_DB", "MISMATCH"}:
                print(f"{table}|{expected}|{actual}|{missing}|{status}")


if __name__ == "__main__":
    main()
