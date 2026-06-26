import mysql from 'mysql2/promise';
import fs from 'fs';

const db = await mysql.createConnection({
  host: 'localhost', port: 3306, user: 'root', password: '112233', database: 'sub_hdc',
});

const [rows] = await db.query('SELECT * FROM c_file');

let sql = '\n-- Data for c_file\n';
for (const r of rows) {
  const esc = (v) => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "\\'")}'`;
  sql += `INSERT INTO c_file (file_name, type, note) VALUES (${esc(r.file_name)}, ${esc(r.type)}, ${esc(r.note)});\n`;
}

fs.appendFileSync('E:/SUB_HDC/table/c_file.sql', sql, 'utf8');
console.log(`Appended ${rows.length} rows`);
await db.end();
