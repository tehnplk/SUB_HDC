"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Download, Send, Sparkles, UserRound, X } from "lucide-react";
import { ImportingNotice, useImportingGuard } from "@/components/importing-guard";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content: "สอบถามข้อมูลกับ AI",
  },
];

const QUICK_QUESTIONS = [
  "นับจำนวนประชากร แยก ชาย หญิง",
  "โรคที่พบมากสุด 10 อันดับ ปี 2569",
  "จำนวนผู้มารับบริการ ปี 2569",
  "สรุปจำนวนข้อมูลในแต่ละตาราง",
  "จำนวน visit แยกรายเดือน ปี 2569",
  "รายการตารางที่นำเข้าแล้วมีอะไรบ้าง",
  "นับจำนวนผู้ป่วย OPD ปี 2569",
  "export Excel โรคที่พบมากสุด 10 อันดับ ปี 2569",
  "แสดงกราฟ โรคที่พบมากสุด 10 อันดับ ปี 2569",
];

const CHART_COLORS = [
  "#0f766e",
  "#2563eb",
  "#dc2626",
  "#ca8a04",
  "#7c3aed",
  "#0891b2",
  "#16a34a",
  "#db2777",
  "#ea580c",
  "#4f46e5",
  "#65a30d",
  "#9333ea",
];
const SUPPORTED_CHART_TYPES = new Set(["bar", "line", "pie", "radar"]);
let chartJsPromise = null;

function loadChartJs() {
  if (!chartJsPromise) {
    chartJsPromise = import("chart.js").then(({ Chart, registerables }) => {
      Chart.register(...registerables);
      return Chart;
    });
  }
  return chartJsPromise;
}

function pickQuickQuestions(excludeQuestions = []) {
  const excluded = new Set(excludeQuestions);
  return QUICK_QUESTIONS
    .filter((question) => !excluded.has(question))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

function getApiMessages(messages) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableStart(lines, index) {
  return lines[index]?.includes("|") && isTableSeparator(lines[index + 1] || "");
}

function isListItem(line) {
  return /^\s*(?:[-*]|\d+\.)\s+/.test(line);
}

function renderInlineMarkdown(text, keyPrefix) {
  return String(text)
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={key}>{part.slice(1, -1)}</code>;
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
}

function parseMarkdownBlocks(content) {
  const lines = String(content || "").split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(lines[index]);
      const rows = [];
      index += 2;

      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ type: "table", header, rows });
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (isListItem(line)) {
      const items = [];
      while (index < lines.length && isListItem(lines[index])) {
        items.push(lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isTableStart(lines, index) &&
      !lines[index].trim().match(/^(#{1,3})\s+(.+)$/) &&
      !isListItem(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}

function MarkdownContent({ content }) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="chatMarkdown">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <p key={`heading-${blockIndex}`} className={`chatMarkdownHeading level${block.level}`}>
              {renderInlineMarkdown(block.text, `heading-${blockIndex}`)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`} className="chatMarkdownList">
              {block.items.map((item, itemIndex) => (
                <li key={`list-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item, `list-${blockIndex}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <div key={`table-${blockIndex}`} className="chatMarkdownTableWrap">
              <table className="chatMarkdownTable">
                <thead>
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={`table-${blockIndex}-head-${cellIndex}`}>
                        {renderInlineMarkdown(cell, `table-${blockIndex}-head-${cellIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`table-${blockIndex}-row-${rowIndex}`}>
                      {block.header.map((_, cellIndex) => (
                        <td key={`table-${blockIndex}-row-${rowIndex}-${cellIndex}`}>
                          {renderInlineMarkdown(row[cellIndex] || "", `table-${blockIndex}-row-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="chatMarkdownParagraph">
            {renderInlineMarkdown(block.text, `paragraph-${blockIndex}`)}
          </p>
        );
      })}
    </div>
  );
}

function alphaColor(hex, alpha) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getChartType(chart) {
  return SUPPORTED_CHART_TYPES.has(chart?.type) ? chart.type : "bar";
}

function getChartLabels(chart) {
  if (Array.isArray(chart?.labels) && chart.labels.length) return chart.labels;
  return Array.isArray(chart?.rows) ? chart.rows.map((row) => row.label) : [];
}

function getChartDatasets(chart) {
  if (Array.isArray(chart?.datasets) && chart.datasets.length) return chart.datasets;
  if (!Array.isArray(chart?.rows) || !chart.rows.length) return [];
  return [
    {
      label: chart.valueField || "Value",
      values: chart.rows.map((row) => row.value),
    },
  ];
}

function makeChartData(chart) {
  const type = getChartType(chart);
  const labels = getChartLabels(chart);
  const datasets = getChartDatasets(chart);

  return {
    labels,
    datasets: datasets.map((dataset, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      const values = Array.isArray(dataset.values) ? dataset.values : [];

      if (type === "pie") {
        return {
          label: dataset.label || "Value",
          data: values,
          backgroundColor: values.map((_, valueIndex) => CHART_COLORS[valueIndex % CHART_COLORS.length]),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 4,
        };
      }

      return {
        label: dataset.label || "Value",
        data: values,
        fill: type === "radar",
        backgroundColor: type === "bar" ? alphaColor(color, 0.78) : alphaColor(color, type === "radar" ? 0.18 : 0.12),
        borderColor: color,
        borderWidth: type === "radar" ? 2 : 2,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        tension: type === "line" ? 0.25 : 0,
      };
    }),
  };
}

function makeChartOptions(chart) {
  const type = getChartType(chart);
  const bodyFont = typeof window === "undefined" ? undefined : getComputedStyle(document.body).fontFamily;
  const hasCartesianScale = type === "bar" || type === "line";

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: type === "pie" || type === "radar" || getChartDatasets(chart).length > 1,
        labels: {
          boxWidth: 12,
          color: "#344054",
          font: bodyFont ? { family: bodyFont, size: 11, weight: "700" } : undefined,
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.dataset?.label ? `${context.dataset.label}: ` : "";
            const parsedValue =
              typeof context.parsed === "number"
                ? context.parsed
                : (context.parsed?.y ?? context.parsed?.r ?? 0);
            const value = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(parsedValue);
            return `${label}${value}`;
          },
        },
      },
    },
    scales: hasCartesianScale
      ? {
          x: {
            ticks: { color: "#475467", maxRotation: 35, minRotation: 0 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#475467" },
            grid: { color: "#e9f1ed" },
          },
        }
      : type === "radar"
        ? {
            r: {
              beginAtZero: true,
              ticks: { backdropColor: "transparent", color: "#475467" },
              grid: { color: "#d7e8de" },
              pointLabels: { color: "#344054", font: bodyFont ? { family: bodyFont, size: 11, weight: "700" } : undefined },
            },
          }
        : {},
  };
}

function ChatChart({ chart }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      if (!chart?.rows?.length) return;

      const Chart = await loadChartJs();
      if (cancelled || !canvasRef.current) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
      chartInstanceRef.current = new Chart(canvasRef.current, {
        type: getChartType(chart),
        data: makeChartData(chart),
        options: makeChartOptions(chart),
      });
    }

    renderChart();

    return () => {
      cancelled = true;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chart]);

  if (!chart?.rows?.length) return null;

  return (
    <div className="chatChart" role="img" aria-label={chart.title || "DbQuery chart"}>
      <div className="chatChartTitle">{chart.title || "DbQuery chart"}</div>
      <div className="chatChartCanvas">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function ChatExcelExports({ exports }) {
  if (!exports?.length) return null;

  return (
    <div className="chatExportList" aria-label="Excel exports">
      {exports.map((item, index) => (
        <a
          key={`${item.downloadUrl}-${index}`}
          className="chatExportLink"
          href={item.downloadUrl}
          download={item.filename}
        >
          <Download aria-hidden="true" />
          <span>{item.filename || "Download Excel"}</span>
          <small>{new Intl.NumberFormat("th-TH").format(item.rowCount || 0)} rows</small>
        </a>
      ))}
    </div>
  );
}

export default function AiChatPage() {
  const importing = useImportingGuard();
  const formRef = useRef(null);
  const chatBoxRef = useRef(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeToolDetail, setActiveToolDetail] = useState(null);

  const canSend = input.trim().length > 0 && !loading;
  const apiMessages = useMemo(() => getApiMessages(messages), [messages]);

  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (!chatBox) return;

    requestAnimationFrame(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  }, [messages, loading]);

  useEffect(() => {
    setQuickQuestions(pickQuickQuestions());
  }, []);

  useEffect(() => {
    if (!activeToolDetail) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setActiveToolDetail(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeToolDetail]);

  async function askAgent(content) {
    const trimmedContent = String(content || "").trim();
    if (!trimmedContent || loading) return;

    const userMessage = { role: "user", content: trimmedContent };
    const nextMessages = [...apiMessages, userMessage];

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI chat failed");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.answer,
          model: payload.model,
          toolCalls: payload.toolCalls || [],
          chart: payload.chart || null,
          excelExports: payload.excelExports || [],
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSend) return;
    await askAgent(input);
  }

  async function handleQuickQuestion(question) {
    if (loading) return;
    setQuickQuestions(pickQuickQuestions([question]));
    await askAgent(question);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <main className="main chatMain">
      <section className="panel panelWide chatPanel">
        <div className="headerRow chatHeader">
          <div className="titleRow">
            <span className="iconBadge">
              <Sparkles aria-hidden="true" />
            </span>
            <div className="titleText">
              <p className="eyebrow">DeepSeek</p>
              <h1>AI Chat</h1>
            </div>
          </div>
          <Link href="/dashboard/hos-list" className="navLink">
            <ArrowLeft aria-hidden="true" />
            Dashboard
          </Link>
        </div>

        <div ref={chatBoxRef} className="chatBox" aria-live="polite">
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`chatMessage ${message.role}`}>
              <span className="chatAvatar">
                {message.role === "user" ? <UserRound aria-hidden="true" /> : <Bot aria-hidden="true" />}
              </span>
              <div className="chatBubble">
                <MarkdownContent content={message.content} />
                <ChatChart chart={message.chart} />
                <ChatExcelExports exports={message.excelExports} />
                {message.toolCalls?.length ? (
                  <div className="chatToolList" aria-label="Tool calls">
                    {message.toolCalls.map((tool, toolIndex) => (
                      <button
                        type="button"
                        key={`${tool.name}-${toolIndex}`}
                        className="chatToolButton"
                        onClick={() => setActiveToolDetail(tool)}
                        title={tool.sql || tool.error || tool.name}
                      >
                        <span className={tool.ok ? "chatToolBadge" : "chatToolBadge chatToolBadgeError"}>
                          {tool.name}
                          {tool.ok ? ` (${tool.rowCount})` : " failed"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.model ? <span className="chatModel">{message.model}</span> : null}
              </div>
            </article>
          ))}
          {loading ? (
            <article className="chatMessage assistant">
              <span className="chatAvatar chatAvatarThinking">
                <Bot aria-hidden="true" />
              </span>
              <div className="chatBubble">
                <p>Thinking...</p>
              </div>
            </article>
          ) : null}
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="chatQuickQuestions" aria-label="Quick questions">
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              className="chatQuickQuestion"
              onClick={() => handleQuickQuestion(question)}
              disabled={loading}
            >
              {question}
            </button>
          ))}
        </div>

        {importing ? (
          <ImportingNotice />
        ) : (
          <form ref={formRef} className="chatComposer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={2}
              aria-label="Message"
            />
            <button type="submit" className="primary" disabled={!canSend}>
              <Send aria-hidden="true" />
              Send
            </button>
          </form>
        )}
      </section>
      {activeToolDetail ? (
        <div className="chatToolModalBackdrop" onClick={() => setActiveToolDetail(null)}>
          <div
            className="chatToolModal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeToolDetail.name || "Tool"} code panel`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="chatToolModalHeader">
              <div>
                <p className="eyebrow">Tool call</p>
                <h2>{activeToolDetail.name || "Tool"}</h2>
              </div>
              <button type="button" className="chatToolModalClose" onClick={() => setActiveToolDetail(null)} aria-label="Close code panel">
                <X aria-hidden="true" />
              </button>
            </div>
            <pre className={activeToolDetail.ok ? "chatToolModalCode" : "chatToolModalCode chatToolModalCodeError"}>
              <code>{activeToolDetail.sql || activeToolDetail.error}</code>
            </pre>
          </div>
        </div>
      ) : null}
    </main>
  );
}
