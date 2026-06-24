from pathlib import Path
import pymysql
import sys
sys.path.insert(0, str(Path('scripts').resolve()))
from import_f43 import load_env

def qi(name):
    return '`' + name.replace('`', '``') + '`'

env = load_env(Path('.env'))
db = env.get('DATABASE', 'sub_hdc')
conn = pymysql.connect(host=env.get('HOST','localhost'), port=int(env.get('PORT','3306')), user=env.get('USER','root'), password=env.get('PASSWORD',''), database=db, charset='utf8mb4')
missing = []
total_blank = 0
try:
    with conn.cursor() as cur:
        cur.execute('SHOW TABLES')
        for (table,) in cur.fetchall():
            cur.execute(f"SELECT COUNT(*) FROM {qi(table)} WHERE FILE_NAME IS NULL OR FILE_NAME = ''")
            count = cur.fetchone()[0]
            if count:
                missing.append((table, count))
                total_blank += count
finally:
    conn.close()
print(f'blank_file_name_rows|{total_blank}')
for table, count in missing:
    print(f'{table}|{count}')
