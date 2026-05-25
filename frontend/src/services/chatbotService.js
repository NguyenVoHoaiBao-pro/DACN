/**
 * Graph RAG Chatbot API (service riêng, mặc định port 8000).
 * Cấu hình: VITE_CHATBOT_API_URL trong .env
 */
const CHATBOT_BASE =
  import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:8000";

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function checkChatbotHealth() {
  const url = `${CHATBOT_BASE}/api/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await parseJson(res);
    return { ok: res.ok, data, url };
  } catch (err) {
    console.warn("[Chatbot] Health check failed:", url, err);
    return {
      ok: false,
      data: {},
      url,
      error:
        err.name === "TimeoutError"
          ? "API phản hồi quá chậm (>15s)"
          : `Không kết nối được ${CHATBOT_BASE}`,
    };
  }
}

export async function sendChatMessage({ sessionId, question, history = [] }) {
  const res = await fetch(`${CHATBOT_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      question,
      history: history.slice(-10),
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : "Không thể kết nối trợ lý. Vui lòng thử lại sau.";
    throw new Error(detail);
  }
  return data;
}

/**
 * Parse SSE buffer thành các event { event, data }.
 */
function parseSseChunk(buffer) {
  const events = [];
  const parts = buffer.split("\n\n");
  const complete = parts.slice(0, -1);
  const remainder = parts[parts.length - 1] || "";

  for (const block of complete) {
    if (!block.trim()) continue;
    let eventName = "message";
    let dataLine = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLine += line.slice(5).trim();
      }
    }
    if (dataLine) {
      try {
        events.push({ event: eventName, data: JSON.parse(dataLine) });
      } catch {
        /* ignore malformed */
      }
    }
  }
  return { events, remainder };
}

/**
 * Streaming chat — SSE từ POST /api/chat/stream
 * @param {object} opts
 * @param {(data: object) => void} [opts.onStatus]
 * @param {(content: string) => void} [opts.onToken]
 * @param {(data: object) => void} [opts.onDone]
 */
export async function sendChatMessageStream({
  sessionId,
  question,
  history = [],
  onStatus,
  onToken,
  onDone,
  signal,
}) {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      question,
      history: history.slice(-10),
    }),
    signal,
  });

  if (!res.ok) {
    const data = await parseJson(res);
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : "Không thể kết nối trợ lý. Vui lòng thử lại sau.";
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, remainder } = parseSseChunk(buffer);
    buffer = remainder;

    for (const { event, data } of events) {
      if (event === "status" && onStatus) {
        onStatus(data);
      } else if (event === "token" && onToken && data.content) {
        onToken(data.content);
      } else if (event === "done") {
        donePayload = data;
      } else if (event === "error") {
        throw new Error(data.message || "Lỗi stream");
      }
    }
  }

  if (buffer.trim()) {
    const { events } = parseSseChunk(`${buffer}\n\n`);
    for (const { event, data } of events) {
      if (event === "token" && onToken && data.content) {
        onToken(data.content);
      } else if (event === "done") {
        donePayload = data;
      } else if (event === "error") {
        throw new Error(data.message || "Lỗi stream");
      }
    }
  }

  if (onDone && donePayload) {
    onDone(donePayload);
  }
  return donePayload;
}

export { CHATBOT_BASE };
