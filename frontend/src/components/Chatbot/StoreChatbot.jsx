import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import {
  Box,
  Chip,
  CircularProgress,
  Fab,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/appSlice";
import {
  checkChatbotHealth,
  sendChatMessageStream,
} from "../../services/chatbotService";
import "./StoreChatbot.css";

const QUICK_QUESTIONS = [
  "Shop có bao nhiêu sản phẩm?",
  "Thương hiệu nào có nhiều sản phẩm nhất?",
  "Sản phẩm nào đang giảm giá?",
  "Có laptop gaming không?",
];

const WELCOME =
  "Xin chào! 👋 Em là trợ lý AI của Electro Store.\n\nAnh/chị cần tư vấn sản phẩm, khuyến mãi hay thông tin đơn hàng? Hãy chọn gợi ý bên dưới hoặc nhập câu hỏi nhé!";

const STATUS_HINTS = {
  started: "Đã nhận câu hỏi",
  retrieving: "Đang tìm trong kho dữ liệu cửa hàng...",
  generating: "Đang soạn câu trả lời...",
  complete: "Hoàn tất",
  cache_hit: "Trả lời nhanh từ bộ nhớ đệm ⚡",
};

function getOrCreateSessionId(userId) {
  const key = "electro_chatbot_session";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    const prefix = userId ? `user_${userId}` : "guest";
    sid = `${prefix}_${Date.now()}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function getUserFriendlyStatus(healthOk, healthLabel) {
  if (healthOk) return { label: "Đang trực tuyến", online: true };
  if (healthLabel.includes("Neo4j") || healthLabel.includes("đồng bộ"))
    return { label: "Đang kết nối dữ liệu...", online: false };
  if (healthLabel.includes("NVIDIA"))
    return { label: "Đang khởi động...", online: false };
  return { label: "Tạm ngoại tuyến", online: false };
}

const TypingIndicator = () => (
  <div className="store-chatbot-typing" aria-label="Đang trả lời">
    <span />
    <span />
    <span />
  </div>
);

const ChatMessage = ({ msg }) => (
  <div
    className={`store-chatbot-row ${msg.role} ${msg.loading ? "loading" : ""}`}
  >
    <div className="store-chatbot-row-avatar" aria-hidden>
      {msg.role === "user" ? (
        <PersonOutlineIcon sx={{ fontSize: 16 }} />
      ) : (
        <SmartToyOutlinedIcon sx={{ fontSize: 16 }} />
      )}
    </div>
    <div
      className={`store-chatbot-msg ${msg.role} ${msg.loading ? "loading" : ""}`}
    >
      {msg.loading && !msg.text ? (
        <>
          {msg.statusHint && (
            <span className="store-chatbot-status-hint">{msg.statusHint}</span>
          )}
          <TypingIndicator />
        </>
      ) : (
        <>
          {msg.text}
          {msg.fromCache && (
            <span className="store-chatbot-msg-meta store-chatbot-cache-badge">
              ⚡ Trả lời từ cache
            </span>
          )}
          {msg.status && msg.status !== "Accurate" && (
            <span className="store-chatbot-msg-meta">
              Thông tin tham khảo — {msg.status}
            </span>
          )}
        </>
      )}
    </div>
  </div>
);

const StoreChatbot = () => {
  const user = useSelector(selectUser);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthLabel, setHealthLabel] = useState("Đang kiểm tra...");
  const [healthOk, setHealthOk] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: WELCOME },
  ]);
  const [clientHistory, setClientHistory] = useState([]);
  const [sessionId, setSessionId] = useState(() =>
    getOrCreateSessionId(user?.id)
  );
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const hasUserMessage = messages.some((m) => m.role === "user");
  const status = getUserFriendlyStatus(healthOk, healthLabel);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, scrollToBottom]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data, error, url } = await checkChatbotHealth();
        if (cancelled) return;
        if (error) {
          setHealthOk(false);
          setHealthLabel(error);
          console.warn("[Chatbot] API URL:", url);
          return;
        }
        if (typeof data.neo4j_connected !== "boolean") {
          setHealthOk(false);
          setHealthLabel(
            "Không đọc được /api/health — kiểm tra VITE_CHATBOT_API_URL"
          );
          console.warn("[Chatbot] Health response invalid:", data, url);
          return;
        }
        const validatorOk =
          data.validator_configured ?? data.nvidia_configured;
        const ok =
          data.neo4j_connected &&
          data.nvidia_configured &&
          validatorOk &&
          data.graph_ready;
        setHealthOk(ok);
        if (ok) setHealthLabel("Trợ lý sẵn sàng");
        else if (!data.neo4j_connected)
          setHealthLabel("Neo4j chưa kết nối — kiểm tra .env NEO4J_*");
        else if (!data.nvidia_configured || !validatorOk)
          setHealthLabel("Thiếu NVIDIA_API_KEY (Validator/T2C/Generator)");
        else if (!data.graph_ready)
          setHealthLabel("Graph trống — cần SYNC Neo4j");
        else setHealthLabel("Hệ thống chưa sẵn sàng");
        if (!ok) {
          console.warn("[Chatbot] Health:", data, "URL:", url);
        }
      } catch (err) {
        if (!cancelled) {
          setHealthOk(false);
          setHealthLabel("API trợ lý chưa chạy (port 8000)");
          console.warn("[Chatbot] Health exception:", err);
        }
      }
    };
    run();
    const t = setInterval(run, 45000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const handleNewChat = () => {
    const prefix = user?.id ? `user_${user.id}` : "guest";
    const sid = `${prefix}_${Date.now()}`;
    sessionStorage.setItem("electro_chatbot_session", sid);
    setSessionId(sid);
    setClientHistory([]);
    setMessages([{ role: "assistant", text: WELCOME }]);
    inputRef.current?.focus();
  };

  const sendQuestion = async (question) => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "",
        loading: true,
        statusHint: STATUS_HINTS.started,
      },
    ]);

    const updateAssistant = (patch) => {
      setMessages((prev) => {
        if (!prev.length || prev[prev.length - 1].role !== "assistant") {
          return prev;
        }
        const idx = prev.length - 1;
        return prev.map((m, i) => (i === idx ? { ...m, ...patch } : m));
      });
    };

    try {
      let fullAnswer = "";
      const done = await sendChatMessageStream({
        sessionId,
        question: q,
        history: clientHistory.slice(-10),
        onStatus: (data) => {
          const hint =
            STATUS_HINTS[data.phase] || data.message || "Đang xử lý...";
          updateAssistant({ statusHint: hint, loading: true });
        },
        onToken: (content) => {
          fullAnswer += content;
          updateAssistant({
            text: fullAnswer,
            loading: true,
            statusHint: STATUS_HINTS.generating,
          });
        },
        onDone: (data) => {
          fullAnswer = data.answer || fullAnswer;
          updateAssistant({
            text: fullAnswer,
            loading: false,
            status: data.status,
            statusHint: undefined,
            fromCache: Boolean(data.from_cache),
          });
        },
      });

      const finalText = done?.answer || fullAnswer;
      if (finalText) {
        setClientHistory((prev) => [
          ...prev,
          `Khách: ${q}`,
          `Trợ lý: ${finalText}`,
        ]);
      }
    } catch (err) {
      updateAssistant({
        text:
          err.message ||
          "Xin lỗi, em chưa kết nối được máy chủ trợ lý. Vui lòng thử lại sau vài phút nhé! 🙏",
        loading: false,
        statusHint: undefined,
      });
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return createPortal(
    <div className="store-chatbot-root">
      {open && (
        <div
          className="store-chatbot-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {!open && (
        <div className="store-chatbot-fab-wrap">
          <span className="store-chatbot-fab-pulse" aria-hidden />
          {healthOk && (
            <span className="store-chatbot-fab-badge" title="Trực tuyến" />
          )}
          <Tooltip title="Trợ lý AI — Hỏi ngay!" placement="left" arrow>
            <Fab
              className="store-chatbot-fab"
              onClick={() => setOpen(true)}
              aria-label="Mở trợ lý AI"
            >
              <SmartToyOutlinedIcon sx={{ fontSize: 28 }} />
            </Fab>
          </Tooltip>
        </div>
      )}

      {open && (
        <Box
          className="store-chatbot-panel"
          role="dialog"
          aria-label="Trợ lý cửa hàng Electro"
          sx={{
            position: "fixed",
            bottom: 96,
            right: 24,
            left: "auto",
            zIndex: 1400,
          }}
        >
          <header className="store-chatbot-header">
            <div className="store-chatbot-header-info">
              <div className="store-chatbot-avatar">
                <AutoAwesomeIcon sx={{ fontSize: 22 }} />
              </div>
              <div>
                <div className="store-chatbot-header-title">
                  Trợ lý Electro
                </div>
                <div className="store-chatbot-header-status">
                  <span
                    className={`store-chatbot-status-dot ${status.online ? "online" : "offline"}`}
                  />
                  {status.label}
                </div>
              </div>
            </div>
            <div className="store-chatbot-header-actions">
              <Tooltip title="Cuộc trò chuyện mới" arrow>
                <IconButton
                  size="small"
                  className="store-chatbot-header-btn"
                  onClick={handleNewChat}
                  aria-label="Cuộc trò chuyện mới"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Đóng" arrow>
                <IconButton
                  size="small"
                  className="store-chatbot-header-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </header>

          <Box className="store-chatbot-messages">
            <div className="store-chatbot-date-divider">
              <span>Hôm nay</span>
            </div>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {!healthOk && (
            <div className="store-chatbot-offline-banner" role="status">
              {healthLabel || "Trợ lý đang khởi động"} — vẫn có thể thử gửi
              câu hỏi. (F12 → Console để xem chi tiết)
            </div>
          )}

          {!hasUserMessage && !loading && (
            <div className="store-chatbot-hints-wrap">
              <div className="store-chatbot-hints-label">Gợi ý nhanh</div>
              <div className="store-chatbot-hints">
                {QUICK_QUESTIONS.map((q) => (
                  <Chip
                    key={q}
                    label={q}
                    size="small"
                    variant="outlined"
                    className="store-chatbot-hint-chip"
                    onClick={() => sendQuestion(q)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
          )}

          <Box
            component="form"
            className="store-chatbot-input-wrap"
            onSubmit={handleSubmit}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              multiline
              maxRows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <IconButton
              type="submit"
              className="store-chatbot-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Gửi tin nhắn"
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : (
                <SendIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
        </Box>
      )}
    </div>,
    document.body
  );
};

export default StoreChatbot;
