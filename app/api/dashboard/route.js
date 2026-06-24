import { createDbConnection } from "../../../lib/db";

export async function GET() {
  try {
    const conn = await createDbConnection();

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

    return Response.json({ hospcode, totalFiles, filesWithData, totalRows, files });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
