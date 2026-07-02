import OpenAI from "openai";
import { buildChartFromDbResult, userRequestedChart } from "@/lib/ai-chart.mjs";
import { DB_QUERY_TOOL, DB_QUERY_TOOL_NAME, runDbQueryTool } from "@/lib/db-query-tool.mjs";
import {
  EXCEL_EXPORT_TOOL,
  EXCEL_EXPORT_TOOL_NAME,
  runExcelExportTool,
  userRequestedExcelExport,
} from "@/lib/excel-export-tool.mjs";
import { requireAppAuth } from "../../../../lib/auth-guard.mjs";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 8000;
const MAX_TOOL_ROUNDS = 6;
const SYSTEM_PROMPT = `You are a concise assistant for SUB HDC data work.
Answer in the same language as the user's question. If the user writes Thai, answer in Thai only. Never mix in Chinese.
Use the ${DB_QUERY_TOOL_NAME} tool when a user asks questions that need live database data or schema.
Use the ${EXCEL_EXPORT_TOOL_NAME} tool only when the latest user message explicitly asks to generate, export, download, or create Excel/XLSX/spreadsheet output from database data.
Only request read-only SQL. Never request INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE, REPLACE, or other mutation SQL.
Prefer short aggregate queries and limit result sets. Use c_file to discover imported F43 table names when needed.
c_file columns are file_name, type, and note. Never query c_file.name.
For population/person questions, use the person table. The person.sex field uses 1 for male and 2 for female.
For disease ranking questions such as "โรคที่พบมากสุด", use primary diagnosis rows from diagnosis_opd and diagnosis_ipd.
diagnosis_opd has date_serv, diagtype, and diagcode. diagnosis_ipd has datetime_admit, diagtype, and diagcode.
Use diagtype = '1' for primary diagnosis unless the user explicitly asks for all diagnosis types.
For Thai Buddhist fiscal years, convert to AD fiscal year: 2569 means dates >= '20251001' and < '20261001'.
Use LEFT(datetime_admit, 8) for IPD date filtering. There is no ICD name lookup table in this database, so answer with diagcode when names are unavailable.
For common disease-ranking prompts, run the aggregate query directly; do not spend tool calls describing diagnosis tables, searching c_file, or searching for ICD name tables.
For "โรคที่พบมากสุด 10 อันดับ ปี 2569", use this SQL shape:
SELECT diagcode, COUNT(*) AS cnt FROM (
  SELECT diagcode FROM diagnosis_opd WHERE diagtype = '1' AND date_serv >= '20251001' AND date_serv < '20261001'
  UNION ALL
  SELECT diagcode FROM diagnosis_ipd WHERE diagtype = '1' AND LEFT(datetime_admit, 8) >= '20251001' AND LEFT(datetime_admit, 8) < '20261001'
) AS all_dx GROUP BY diagcode ORDER BY cnt DESC LIMIT 10
Do not speculate that a fiscal year is complete, incomplete, newly started, or nearly finished. Do not write phrases like "เพิ่งเริ่มต้น" unless the user asks about completeness. Say only that the answer is based on records currently in the database for the requested date range.
Do not combine SHOW statements with OR. Use one valid SQL statement at a time.
After a tool result, answer clearly and mention important limits or assumptions.
Use clear visual formatting whenever it improves clarity:
- Use a compact GitHub-flavored markdown table for rankings, counts by group, comparisons, totals by category, schema lists, or any answer with 2+ comparable rows.
- Keep table headers human-readable and include units in the header when useful.
- Use bullets or short paragraphs for explanation-only answers where a table would add noise.
- Do not use raw HTML, Mermaid, or fenced code blocks for result tables.
- Only mention or prepare chart-oriented output when the user explicitly asks for a chart, graph, plot, กราฟ, or แผนภูมิ.
- Supported chart prompts are bar chart, column chart, line chart, multiline chart, pie chart, and radar chart. Column chart renders as a vertical bar chart. If the user asks for a chart without a specific type, the UI defaults to a bar chart.
- When the user asks for a chart, do not draw an ASCII/text chart or fenced code chart. Give a short summary or markdown table; the UI will render the actual chart.
When the user asks for Excel export, call ${EXCEL_EXPORT_TOOL_NAME} with the same read-only aggregate SQL you would use for the answer, then mention that the Excel file is ready. Do not invent a download URL yourself.
Keep any intro to one short sentence.`;

function normalizeMessages(input) {
  const source = Array.isArray(input?.messages)
    ? input.messages
    : input?.message
      ? [{ role: "user", content: input.message }]
      : [];

  return source
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message?.role,
      content: typeof message?.content === "string" ? message.content.trim() : "",
    }))
    .filter((message) => ["system", "user", "assistant"].includes(message.role) && message.content)
    .map((message) => ({
      ...message,
      content: message.content.slice(0, MAX_CONTENT_LENGTH),
    }));
}

function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
  });
}

function parseToolArguments(toolCall) {
  try {
    return JSON.parse(toolCall.function?.arguments || "{}");
  } catch {
    throw new Error(`${toolCall.function?.name || "Tool"} received invalid JSON arguments`);
  }
}

function toolResultMessage(toolCall, content) {
  return {
    role: "tool",
    tool_call_id: toolCall.id,
    content: JSON.stringify(content),
  };
}

async function forceFinalAnswer(client, messages) {
  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
    messages: [
      ...messages,
      {
        role: "system",
        content:
          "Do not call tools again. Answer now using only the tool results already provided. Use a compact markdown table for comparable rows. If disease names are unavailable, show diagcode.",
      },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  return {
    answer: completion.choices?.[0]?.message?.content?.trim() || "",
    completion,
  };
}

async function runChatAgent(client, inputMessages) {
  const shouldReturnChart = userRequestedChart(inputMessages);
  const shouldExportExcel = userRequestedExcelExport(inputMessages);
  const availableTools = shouldExportExcel ? [DB_QUERY_TOOL, EXCEL_EXPORT_TOOL] : [DB_QUERY_TOOL];
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...(shouldReturnChart
      ? [
          {
            role: "system",
            content:
              `The latest user explicitly asked for a chart. If the chart depends on database data, call ${DB_QUERY_TOOL_NAME} to fetch the chart rows even if prior assistant text already contains similar numbers. Do not draw ASCII charts or fenced chart blocks; the UI will render the chart from tool rows.`,
          },
        ]
      : []),
    ...(shouldExportExcel
      ? [
          {
            role: "system",
            content:
              `The latest user explicitly asked for Excel export. If the export depends on database data, call ${EXCEL_EXPORT_TOOL_NAME} with one read-only SQL query. Do not invent a download URL; the tool result provides it.`,
          },
        ]
      : []),
    ...inputMessages,
  ];
  const toolCalls = [];
  const excelExports = [];
  let chart = null;
  let finalCompletion = null;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
      messages,
      tools: availableTools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1200,
    });
    finalCompletion = completion;

    const message = completion.choices?.[0]?.message;
    if (!message) {
      throw new Error("DeepSeek returned an empty message");
    }

    if (!message.tool_calls?.length) {
      return {
        answer: message.content?.trim() || "",
        completion,
        toolCalls,
        chart,
        excelExports,
      };
    }

    if (round >= MAX_TOOL_ROUNDS) {
      const forced = await forceFinalAnswer(client, messages);
      return {
        ...forced,
        toolCalls,
        chart,
        excelExports,
      };
    }

    messages.push({
      role: "assistant",
      content: message.content || null,
      tool_calls: message.tool_calls,
    });

    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function?.name;
      let result;

      try {
        if (toolName !== DB_QUERY_TOOL_NAME) {
          if (toolName !== EXCEL_EXPORT_TOOL_NAME) {
            throw new Error(`Unsupported tool: ${toolName || "unknown"}`);
          }
          result = await runExcelExportTool(parseToolArguments(toolCall));
        } else {
          result = await runDbQueryTool(parseToolArguments(toolCall));
        }
      } catch (error) {
        result = {
          ok: false,
          error: error.message,
        };
      }

      const resultChart = shouldReturnChart ? buildChartFromDbResult(result, inputMessages) : null;
      if (resultChart) {
        chart = resultChart;
      }
      if (toolName === EXCEL_EXPORT_TOOL_NAME && result.ok) {
        excelExports.push({
          filename: result.filename,
          downloadUrl: result.downloadUrl,
          rowCount: result.rowCount || 0,
          sheetName: result.sheetName || null,
        });
      }

      toolCalls.push({
        name: toolName || "unknown",
        sql: result.sql || null,
        ok: result.ok,
        rowCount: result.rowCount || 0,
        columns: result.columns || [],
        error: result.error || null,
        downloadUrl: result.downloadUrl || null,
        filename: result.filename || null,
      });
      messages.push(toolResultMessage(toolCall, result));
    }
  }

  return {
    answer: finalCompletion?.choices?.[0]?.message?.content?.trim() || "",
    completion: finalCompletion,
    toolCalls,
    chart,
    excelExports,
  };
}

export async function POST(request) {
  const unauthorized = await requireAppAuth();
  if (unauthorized) return unauthorized;

  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const messages = normalizeMessages(payload);

    if (!messages.some((message) => message.role === "user")) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const client = getDeepSeekClient();
    const { answer, completion, toolCalls, chart, excelExports } = await runChatAgent(client, messages);

    if (!answer) {
      return Response.json({ error: "DeepSeek returned an empty response" }, { status: 502 });
    }

    return Response.json({
      answer,
      model: completion.model,
      usage: completion.usage || null,
      toolCalls,
      chart,
      excelExports,
    });
  } catch (error) {
    const status = error.status || error.response?.status || 500;
    const message = status === 500 ? "AI chat request failed" : error.message;
    return Response.json({ error: message }, { status });
  }
}
