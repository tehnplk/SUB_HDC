import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tableDir = path.resolve(__dirname, '..', '..', 'migrate', 'table');

const db = await mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '112233',
  database: 'sub_hdc',
});

const [tables] = await db.query(
  "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='sub_hdc' ORDER BY TABLE_NAME"
);

for (const { TABLE_NAME } of tables) {
  const [rows] = await db.query(`SHOW CREATE TABLE \`${TABLE_NAME}\``);
  const sql = rows[0]['Create Table'] + ';\n';
  fs.writeFileSync(path.join(tableDir, `${TABLE_NAME}.sql`), sql, 'utf8');
  console.log(`  ✓ ${TABLE_NAME}.sql`);
}

await db.end();
console.log(`\nDone: ${tables.length} tables`);
