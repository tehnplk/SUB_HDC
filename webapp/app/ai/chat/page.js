"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Download, Send, Sparkles, UserRound } from "lucide-react";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content: "Ask about SUB HDC data, imports, reports, or anything you want to draft with DeepSeek.",
  },
];

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

function formatChartValue(value) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function ChatChart({ chart }) {
  if (!chart?.rows?.length) return null;

  const maxValue = Math.max(...chart.rows.map((row) => row.value), 0);
  if (!maxValue) return null;

  return (
    <div className="chatChart" role="img" aria-label={chart.title || "DbQuery chart"}>
      <div className="chatChartTitle">{chart.title || "DbQuery chart"}</div>
      <div className="chatChartRows">
        {chart.rows.map((row, index) => {
          const width = `${Math.max(3, (row.value / maxValue) * 100)}%`;

          return (
            <div key={`${row.label}-${index}`} className="chatChartRow">
              <span className="chatChartLabel" title={row.label}>
                {row.label}
              </span>
              <span className="chatChartTrack" aria-hidden="true">
                <span className="chatChartBar" style={{ width }} />
              </span>
              <span className="chatChartValue">{formatChartValue(row.value)}</span>
            </div>
          );
        })}
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
  const formRef = useRef(null);
  const chatBoxRef = useRef(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSend = input.trim().length > 0 && !loading;
  const apiMessages = useMemo(() => getApiMessages(messages), [messages]);

  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (!chatBox) return;

    requestAnimationFrame(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  }, [messages, loading]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSend) return;

    const userMessage = { role: "user", content: input.trim() };
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
                      <span
                        key={`${tool.name}-${toolIndex}`}
                        className={tool.ok ? "chatToolBadge" : "chatToolBadge chatToolBadgeError"}
                        title={tool.sql || tool.error || tool.name}
                      >
                        {tool.name}
                        {tool.ok ? ` (${tool.rowCount})` : " failed"}
                      </span>
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
      </section>
    </main>
  );
}
