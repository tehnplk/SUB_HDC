const WRITE_STATEMENT_PATTERN = /\b(insert|update|delete|drop|truncate|alter|create|replace|grant|revoke)\b/i;

function stripLeadingSqlComments(statement) {
  let remaining = String(statement || "").trimStart();

  while (remaining.startsWith("--") || remaining.startsWith("#") || remaining.startsWith("/*")) {
    if (remaining.startsWith("/*")) {
      const endIndex = remaining.indexOf("*/");
      if (endIndex === -1) return "";
      remaining = remaining.slice(endIndex + 2).trimStart();
      continue;
    }

    const newlineIndex = remaining.indexOf("\n");
    if (newlineIndex === -1) return "";
    remaining = remaining.slice(newlineIndex + 1).trimStart();
  }

  return remaining;
}

function stripTrailingSemicolons(sql) {
  let normalized = String(sql || "").trim();
  while (normalized.endsWith(";")) {
    normalized = normalized.slice(0, -1).trimEnd();
  }
  return normalized;
}

export function splitReportSqlStatements(sql) {
  const normalized = stripTrailingSemicolons(sql);
  const statements = [];
  let current = "";
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      current += char;
      if (char === "\\" && quote !== "`" && next) {
        current += next;
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if ((char === "-" && next === "-") || char === "#") {
      lineComment = true;
      current += char;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      current += char + next;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const finalStatement = current.trim();
  if (finalStatement) statements.push(finalStatement);

  return statements;
}

export function normalizeReportSql(sql) {
  const statements = splitReportSqlStatements(sql);
  if (!statements.length) {
    throw new Error("Only SET user variables and one final SELECT are allowed");
  }

  const finalStatement = statements[statements.length - 1];
  const setupStatements = statements.slice(0, -1);
  const finalStatementBody = stripLeadingSqlComments(finalStatement);

  if (!/^(select|with)\s+/i.test(finalStatementBody)) {
    throw new Error("Only SET user variables and one final SELECT are allowed");
  }

  if (statements.some((statement) => WRITE_STATEMENT_PATTERN.test(statement))) {
    throw new Error("Report SQL must be read-only");
  }

  if (setupStatements.some((statement) => !/^set\s+@[\w$.]+\s*(?::=|=|,)/i.test(statement))) {
    throw new Error("Only SET user variables and one final SELECT are allowed");
  }

  return [...setupStatements, finalStatement].join(";\n");
}

export function buildReportQuery(sql) {
  const statements = splitReportSqlStatements(sql);
  const finalStatement = statements[statements.length - 1];
  const setupStatements = statements.slice(0, -1);
  const limitedSelect = `SELECT * FROM (${finalStatement}) AS report_result LIMIT 500`;

  return [...setupStatements, limitedSelect].join(";\n");
}

export function hasMultipleReportStatements(sql) {
  return splitReportSqlStatements(sql).length > 1;
}

export function getReportResultSet(rows, fields) {
  if (Array.isArray(rows) && rows.some((result) => Array.isArray(result))) {
    let lastIndex = rows.length - 1;
    while (lastIndex >= 0 && !Array.isArray(rows[lastIndex])) {
      lastIndex -= 1;
    }

    let fieldIndex = Array.isArray(fields) ? fields.length - 1 : -1;
    while (fieldIndex >= 0 && !Array.isArray(fields[fieldIndex])) {
      fieldIndex -= 1;
    }

    return {
      rows: rows[lastIndex],
      fields: fieldIndex >= 0 ? fields[fieldIndex] : [],
    };
  }

  return {
    rows,
    fields,
  };
}
