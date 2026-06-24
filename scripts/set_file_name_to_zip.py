from pathlib import Path
import pymysql
import sys
sys.path.insert(0, str(Path('scripts').resolve()))
from import_f43 import load_env

def qi(name):
    return '`' + name.replace('`', '``') + '`'

env = load_env(Path('.env'))
database = env.get('DATABASE', 'sub_hdc')
zip_name = 'F43_11251_20260501163101.zip'
conn = pymysql.connect(
    host=env.get('HOST', 'localhost'),
    port=int(env.get('PORT', '3306')),
    user=env.get('USER', 'root'),
    password=env.get('PASSWORD', ''),
    database=database,
    charset='utf8mb4',
    autocommit=True,
)
updated = []
try:
    with conn.cursor() as cur:
        cur.execute('SHOW TABLES')
        tables = sorted(row[0] for row in cur.fetchall())
        for table in tables:
            cur.execute(f"UPDATE {qi(table)} SET FILE_NAME=%s WHERE FILE_NAME IS NULL OR FILE_NAME <> %s", (zip_name, zip_name))
            updated.append((table, cur.rowcount))
finally:
    conn.close()

print('table|updated_rows')
for table, count in updated:
    if count:
        print(f'{table}|{count}')
print(f'total_updated|{sum(count for _, count in updated)}')
