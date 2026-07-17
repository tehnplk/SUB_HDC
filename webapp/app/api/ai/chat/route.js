import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { buildChartFromDbResult, userRequestedChart } from "@/lib/ai-chart.mjs";
import { getDbCatalog } from "@/lib/ai-db-catalog.mjs";
import { DB_QUERY_TOOL, DB_QUERY_TOOL_NAME, runDbQueryTool } from "@/lib/db-query-tool.mjs";
import { HDC_API_TOOL, HDC_API_TOOL_NAME, runHdcApiTool, userMentionedHdc } from "@/lib/hdc-api-tool.mjs";
import {
  EXCEL_EXPORT_TOOL,
  EXCEL_EXPORT_TOOL_NAME,
  runExcelExportTool,
  userRequestedExcelExport,
} from "@/lib/excel-export-tool.mjs";
import { requireAppAuth, requireExcelExportAccess } from "../../../../lib/auth-guard.mjs";

export const runtime = "nodejs";

// Provider-neutral LLM config: any OpenAI-compatible endpoint works via
// LLM_API_KEY / LLM_BASE_URL / LLM_MODEL (legacy DEEPSEEK_* names still read
// as fallback for sites whose .env has not been migrated).
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

function getLlmConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.LLM_BASE_URL || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
  };
}
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 8000;
const MAX_TOOL_ROUNDS = 8;
const SYSTEM_PROMPT_FILE = "ai_system_prompt.json";
const promptCache = { mtimeMs: 0, text: null };

function loadSystemPrompt() {
  const filePath = path.join(process.cwd(), SYSTEM_PROMPT_FILE);
  const { mtimeMs } = statSync(filePath);
  if (promptCache.text && promptCache.mtimeMs === mtimeMs) return promptCache.text;

  const raw = readFileSync(filePath, "utf8");
  const lines = JSON.parse(raw)?.system_prompt;
  if (!Array.isArray(lines) || !lines.length) {
    throw new Error(`${SYSTEM_PROMPT_FILE} must contain a non-empty system_prompt array`);
  }
  promptCache.text = lines
    .join("\n")
    .replaceAll("{DB_QUERY_TOOL_NAME}", DB_QUERY_TOOL_NAME)
    .replaceAll("{EXCEL_EXPORT_TOOL_NAME}", EXCEL_EXPORT_TOOL_NAME);
  promptCache.mtimeMs = mtimeMs;
  return promptCache.text;
}

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

function getLlmClient() {
  const { apiKey, baseURL } = getLlmConfig();
  if (!apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  return new OpenAI({ apiKey, baseURL });
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

// The model must never see the export file path, or it will echo it into the
// conversation text. The UI gets the real downloadUrl via the toolCalls /
// excelExports payload instead.
function sanitizeToolResultForModel(result) {
  if (!result || typeof result !== "object" || !("downloadUrl" in result)) return result;
  const { downloadUrl, ...safe } = result;
  return { ...safe, note: "Excel file is ready. The UI shows the download button; do not write any link or path." };
}

const CHAT_MODEL_PARAMS = { temperature: 0.3, max_tokens: 2000 };

// Stream one completion round. Content deltas are forwarded to the client as
// they arrive; if the round turns out to be a tool round, a reset event clears
// any partial text already shown.
async function streamCompletion(client, request, emit) {
  const stream = await client.chat.completions.create({
    ...request,
    ...CHAT_MODEL_PARAMS,
    stream: true,
    stream_options: { include_usage: true },
  });

  let content = "";
  let emittedChars = 0;
  let sawToolCall = false;
  const toolCalls = [];
  let usage = null;
  let model = null;

  for await (const chunk of stream) {
    model = chunk.model || model;
    if (chunk.usage) usage = chunk.usage;
    const delta = chunk.choices?.[0]?.delta || {};

    for (const toolDelta of delta.tool_calls || []) {
      const index = toolDelta.index ?? 0;
      if (!sawToolCall) {
        sawToolCall = true;
        if (emittedChars) emit({ type: "reset" });
      }
      toolCalls[index] ||= { id: "", type: "function", function: { name: "", arguments: "" } };
      if (toolDelta.id) toolCalls[index].id = toolDelta.id;
      if (toolDelta.function?.name) toolCalls[index].function.name += toolDelta.function.name;
      if (toolDelta.function?.arguments) toolCalls[index].function.arguments += toolDelta.function.arguments;
    }

    if (delta.content) {
      content += delta.content;
      if (!sawToolCall) {
        emit({ type: "delta", text: delta.content });
        emittedChars += delta.content.length;
      }
    }
  }

  return { content, toolCalls: toolCalls.filter(Boolean), usage, model };
}

// tool_choice "none" keeps the provider from emitting raw tool-call markup as
// text when it still wants to call a tool on the wrap-up round.
async function forceFinalAnswer(client, messages, tools, emit) {
  return streamCompletion(
    client,
    {
      model: getLlmConfig().model,
      messages: [
        ...messages,
        {
          role: "system",
          content:
            "Do not call tools again. Answer now using only the tool results already provided. Use a compact markdown table for comparable rows. If disease names are unavailable, show diagcode.",
        },
      ],
      tools,
      tool_choice: "none",
    },
    emit
  );
}

// Strip any provider-internal tool-call markup that leaks into answer text
// (seen with DeepSeek DSML tags when it wants a tool it cannot call).
function stripToolMarkup(text) {
  return String(text || "")
    .replace(/<[｜|][^>]*[｜|]>[^]*?<\/[｜|][^>]*[｜|]>/g, "")
    .replace(/^.*[｜|]DSML[｜|].*$/gm, "")
    .trim();
}

async function runChatAgent(client, inputMessages, emit = () => {}) {
  const shouldReturnChart = userRequestedChart(inputMessages);
  const shouldExportExcel = userRequestedExcelExport(inputMessages);
  const shouldOfferHdcApi = userMentionedHdc(inputMessages);
  const availableTools = [
    DB_QUERY_TOOL,
    ...(shouldExportExcel ? [EXCEL_EXPORT_TOOL] : []),
    ...(shouldOfferHdcApi ? [HDC_API_TOOL] : []),
  ];
  const dbCatalog = await getDbCatalog().catch(() => "");
  const messages = [
    {
      role: "system",
      content: loadSystemPrompt(),
    },
    ...(dbCatalog ? [{ role: "system", content: dbCatalog }] : []),
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
  let lastRound = null;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const completionRound = await streamCompletion(
      client,
      {
        model: getLlmConfig().model,
        messages,
        tools: availableTools,
        tool_choice: "auto",
      },
      emit
    );
    lastRound = completionRound;

    if (!completionRound.toolCalls.length) {
      return {
        answer: stripToolMarkup(completionRound.content),
        model: completionRound.model,
        usage: completionRound.usage,
        toolCalls,
        chart,
        excelExports,
      };
    }

    if (round >= MAX_TOOL_ROUNDS) {
      const forced = await forceFinalAnswer(client, messages, availableTools, emit);
      return {
        answer: stripToolMarkup(forced.content),
        model: forced.model,
        usage: forced.usage,
        toolCalls,
        chart,
        excelExports,
      };
    }

    messages.push({
      role: "assistant",
      content: completionRound.content || null,
      tool_calls: completionRound.toolCalls,
    });

    // Tools are independent read-only queries — run the round's calls in
    // parallel and consume the results in the model's original order.
    const results = await Promise.all(
      completionRound.toolCalls.map(async (toolCall) => {
        const toolName = toolCall.function?.name;
        try {
          if (toolName === DB_QUERY_TOOL_NAME) {
            return await runDbQueryTool(parseToolArguments(toolCall));
          }
          if (toolName === EXCEL_EXPORT_TOOL_NAME) {
            return await runExcelExportTool(parseToolArguments(toolCall));
          }
          if (toolName === HDC_API_TOOL_NAME) {
            return await runHdcApiTool(parseToolArguments(toolCall));
          }
          throw new Error(`Unsupported tool: ${toolName || "unknown"}`);
        } catch (error) {
          return {
            ok: false,
            error: error.message,
          };
        }
      })
    );

    for (const [callIndex, toolCall] of completionRound.toolCalls.entries()) {
      const toolName = toolCall.function?.name;
      const result = results[callIndex];

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

      const toolEntry = {
        name: toolName || "unknown",
        sql: result.sql || null,
        ok: result.ok,
        rowCount: result.rowCount || 0,
        columns: result.columns || [],
        error: result.error || null,
        downloadUrl: result.downloadUrl || null,
        filename: result.filename || null,
      };
      toolCalls.push(toolEntry);
      emit({ type: "tool", tool: toolEntry });
      messages.push(toolResultMessage(toolCall, sanitizeToolResultForModel(result)));
    }
  }

  return {
    answer: lastRound?.content?.trim() || "",
    model: lastRound?.model,
    usage: lastRound?.usage,
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

    if (userRequestedExcelExport(messages)) {
      const exportDenied = await requireExcelExportAccess();
      if (exportDenied) return exportDenied;
    }

    const client = getLlmClient();

    // Server-sent events: content deltas and tool progress stream to the UI
    // while the agent works; a final `done` event carries the full payload.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        try {
          const result = await runChatAgent(client, messages, emit);
          if (!result.answer) {
            emit({ type: "error", error: "LLM returned an empty response" });
          } else {
            emit({
              type: "done",
              answer: result.answer,
              model: result.model || null,
              usage: result.usage || null,
              toolCalls: result.toolCalls,
              chart: result.chart,
              excelExports: result.excelExports,
            });
          }
        } catch (error) {
          const status = error.status || error.response?.status || 500;
          emit({ type: "error", error: status === 500 ? "AI chat request failed" : error.message });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const status = error.status || error.response?.status || 500;
    const message = status === 500 ? "AI chat request failed" : error.message;
    return Response.json({ error: message }, { status });
  }
}
