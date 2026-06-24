from pathlib import Path
import pymysql
import sys
sys.path.insert(0, str(Path('scripts').resolve()))
from import_f43 import load_env

def qi(name):
    return '`' + name.replace('`', '``') + '`'

env = load_env(Path('.env'))
database = env.get('DATABASE', 'sub_hdc')
conn = pymysql.connect(
    host=env.get('HOST', 'localhost'),
    port=int(env.get('PORT', '3306')),
    user=env.get('USER', 'root'),
    password=env.get('PASSWORD', ''),
    database=database,
    charset='utf8mb4',
    autocommit=True,
)
created = []
skipped = []
try:
    with conn.cursor() as cur:
        cur.execute('SHOW TABLES')
        tables = sorted(row[0] for row in cur.fetchall())
        for table in tables:
            cur.execute('''
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema=%s AND table_name=%s AND column_name='FILE_NAME'
            ''', (database, table))
            if cur.fetchone()[0]:
                skipped.append(table)
                continue
            cur.execute(f'ALTER TABLE {qi(table)} ADD COLUMN `FILE_NAME` varchar(255)')
            created.append(table)
finally:
    conn.close()

print(f'added|{len(created)}')
for table in created:
    print(table)
print(f'already_exists|{len(skipped)}')
for table in skipped:
    print(table)
