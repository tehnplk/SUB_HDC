import zipfile
import unittest
from pathlib import Path

from scripts.import_f43 import build_create_table_sql, read_f43_files


class ImportF43Test(unittest.TestCase):
    def test_build_create_table_sql_uses_filename_and_varchar_columns(self):
        sql = build_create_table_sql("PERSON", ["HOSPCODE", "CID", "NAME"])

        self.assertEqual(
            sql,
            (
                "CREATE TABLE `PERSON` "
                "(`HOSPCODE` varchar(255) NULL, `CID` varchar(255) NULL, `NAME` varchar(255) NULL) "
                "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
            ),
        )

    def test_read_f43_files_uses_header_as_columns_and_skips_header_row(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "sample.zip"
            with zipfile.ZipFile(zip_path, "w") as zf:
                zf.writestr("F43_TEST/PERSON.txt", "HOSPCODE|CID|NAME\n11251|123|Alice\n11251|456|Bob\n")

            files = list(read_f43_files(zip_path))

        self.assertEqual(len(files), 1)
        self.assertEqual(files[0].table_name, "PERSON")
        self.assertEqual(files[0].columns, ["HOSPCODE", "CID", "NAME"])
        self.assertEqual(files[0].rows, [["11251", "123", "Alice"], ["11251", "456", "Bob"]])


if __name__ == "__main__":
    unittest.main()
