import mysql from "mysql2/promise";

function loadEnv() {
  const fs = require("node:fs");
  const path = require("node:path");
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const values = {};
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    values[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

export async function GET() {
  try {
    const env = loadEnv();
    const conn = await mysql.createConnection({
      host: env.HOST || "localhost",
      port: Number(env.PORT || 3306),
      user: env.USER || "root",
      password: env.PASSWORD || "",
      database: env.DATABASE || "sub_hdc",
    });

    const [rows] = await conn.query(
      "SELECT hospcode, filename, row_count FROM temp_hos_file_row_count ORDER BY filename"
    );
    await conn.end();

    const files = rows.map((r) => ({
      filename: r.filename,
      row_count: r.row_count,
    }));

    const totalFiles = files.length;
    const filesWithData = files.filter((f) => f.row_count > 0).length;
    const totalRows = files.reduce((sum, f) => sum + f.row_count, 0);
    const hospcode = rows.length > 0 ? rows[0].hospcode : null;

    return Response.json({
      hospcode,
      totalFiles,
      filesWithData,
      totalRows,
      files,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
