import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dictionaryPaths() {
  return [
    process.env.TRANSFORM_DATA_DICTIONARY_PATH,
    path.join(process.cwd(), "transform_data_dict.json"),
    path.resolve(process.cwd(), "..", "transform", "transform_data_dict.json"),
  ].filter(Boolean);
}

async function readDictionary() {
  let lastError;

  for (const filePath of dictionaryPaths()) {
    try {
      const contents = await fs.readFile(filePath, "utf8");
      const dictionary = JSON.parse(contents);

      if (!Array.isArray(dictionary)) {
        throw new Error("Transform data dictionary must be an array");
      }

      return dictionary;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Transform data dictionary was not found");
}

async function readSqlFile(fileName) {
  if (!fileName || path.basename(fileName) !== fileName) return "";

  const filePaths = [
    path.join(process.cwd(), "transform-sql", fileName),
    path.resolve(process.cwd(), "..", "transform", "sql", fileName),
  ];

  for (const filePath of filePaths) {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return "";
}

export async function GET() {
  try {
    const dictionary = await readDictionary();
    const rows = await Promise.all(dictionary.map(async (item, index) => ({
      id: item.transform_table || index + 1,
      transform_table: item.transform_table || "",
      sql_file: item.sql_file || "",
      f43_tables: Array.isArray(item.f43_tables) ? item.f43_tables : [],
      stored_data: item.stored_data || "",
      schema: item.schema || "",
      sql_code: await readSqlFile(item.sql_file),
    })));

    return Response.json({ rows });
  } catch (error) {
    return Response.json(
      { error: `Unable to read transform data dictionary: ${error.message}` },
      { status: 500 }
    );
  }
}
