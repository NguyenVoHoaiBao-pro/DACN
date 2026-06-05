/**
 * Trung tâm Chat đa kênh — Sales Admin
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Forum as ForumIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Send as SendIcon,
  SupportAgent as SupportAgentIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as WebIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  fetchAdminInbox,
  fetchConversationDetail,
  salesReply,
} from "../../services/liveChatService";
import { attributeOrderByCode } from "../../services/salesOpsService";
import "./SalesOmnichannelPage.css";

const CHANNELS = {
  WEB: { label: "Website", color: "#f28900", short: "W" },
  FORM: { label: "Form", color: "#64748b", short: "F" },
  ZALO: { label: "Zalo", color: "#0068ff", short: "Z" },
};

const QUICK_REPLIES = [
  "iPhone 15 Pro Max 256GB — Titan: 28.990.000đ, BH 12 tháng, còn hàng Q1.",
  "Laptop Asus ROG Strix G16 — i7/16GB/RTX4060: 32.490.000đ, trả góp 0% 6 tháng.",
  "Shop hỗ trợ giao GHN 2–4 ngày, COD hoặc chuyển khoản QR.",
];

const formatTime = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const guestInitials = (name) => {
  if (!name) return "K";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const conversationTitle = (c) => c?.guestName || "Khách web";

const conversationMeta = (c) => {
  const parts = [];
  if (c?.customerUserId) parts.push(`KH#${c.customerUserId}`);
  if (c?.guestPhone) parts.push(c.guestPhone);
  else if (c?.guestEmail) parts.push(c.guestEmail);
  return parts.join(" · ") || "Chưa đăng nhập";
};

const ChannelBadge = ({ channel }) => {
  const c = CHANNELS[channel] || CHANNELS.WEB;
  return (
    <Tooltip title={c.label}>
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "6px",
          bgcolor: c.color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {c.short}
      </Box>
    </Tooltip>
  );
};

const MessageBubble = ({ msg }) => {
  const isSales = msg.senderType === "SALES";
  const isSystem = msg.senderType === "SYSTEM";
  const rowClass = isSystem
    ? "sales-chat-msg-row sales-chat-msg-row--system"
    : isSales
      ? "sales-chat-msg-row sales-chat-msg-row--sales"
      : "sales-chat-msg-row";

  const bubbleClass = isSystem
    ? "sales-chat-bubble sales-chat-bubble--system"
    : isSales
      ? "sales-chat-bubble sales-chat-bubble--sales"
      : "sales-chat-bubble sales-chat-bubble--customer";

  let label = msg.senderName || "";
  if (isSystem) label = "Hệ thống";
  else if (isSales) label = msg.senderName ? `${msg.senderName} · Sales` : "Bạn · Sales";
  else label = msg.senderName || "Khách hàng";

  return (
    <div className={rowClass}>
      <div className={bubbleClass}>
        {!isSystem && <span className="sales-chat-bubble__label">{label}</span>}
        {msg.body}
        {msg.createdAt && (
          <span className="sales-chat-bubble__time">{formatTime(msg.createdAt)}</span>
        )}
      </div>
    </div>
  );
};

const SalesOmnichannelPage = () => {
  const [inbox, setInbox] = useState([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [attribCode, setAttribCode] = useState("");
  const [attribMsg, setAttribMsg] = useState("");
  const [attribLoading, setAttribLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const loadInbox = useCallback(async () => {
    try {
      const list = await fetchAdminInbox(mineOnly);
      setInbox(list);
      setActiveId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mineOnly]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await fetchConversationDetail(id);
      setDetail(data.conversation);
      setMessages(data.messages || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadInbox();
    const t = setInterval(loadInbox, 8000);
    return () => clearInterval(t);
  }, [loadInbox]);

  useEffect(() => {
    if (!activeId) return;
    loadDetail(activeId);
    pollRef.current = setInterval(() => loadDetail(activeId), 4000);
    return () => clearInterval(pollRef.current);
  }, [activeId, loadDetail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredInbox = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((c) => {
      const hay = [
        c.guestName,
        c.guestDisplayLabel,
        c.guestPhone,
        c.guestEmail,
        c.lastPreview,
        c.customerUserId != null ? String(c.customerUserId) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inbox, search]);

  const totalUnread = useMemo(
    () => inbox.reduce((s, c) => s + (c.unreadForSales || 0), 0),
    [inbox]
  );

  const handleSend = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      await salesReply(activeId, draft.trim());
      setDraft("");
      await loadDetail(activeId);
      await loadInbox();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const active = inbox.find((c) => c.id === activeId) || detail;

  return (
    <AdminLayout currentPage="Chat đa kênh">
      <Box className="sales-chat-page">
        <Box className="sales-chat-page__header">
          <Box className="sales-chat-page__title-row">
            <Typography component="h1" className="sales-chat-page__title">
              Trung tâm Chat đa kênh
            </Typography>
            <span className="sales-chat-page__inline-stats">
              <span className="sales-chat-page__inline-stat">
                <ForumIcon sx={{ fontSize: 14 }} />
                <strong>{inbox.length}</strong> hội thoại
              </span>
              <span className="sales-chat-page__inline-stat sales-chat-page__inline-stat--unread">
                <strong>{totalUnread}</strong> chưa đọc
              </span>
              <span className="sales-chat-page__inline-stat">
                <WebIcon sx={{ fontSize: 14 }} />
                Web bật
              </span>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                · ~4s
              </Typography>
            </span>
          </Box>
          <Box className="sales-chat-page__header-actions">
            <Tooltip title="Làm mới danh sách">
              <IconButton size="small" onClick={() => { setLoading(true); loadInbox(); }} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={mineOnly}
                  onChange={(e) => {
                    setMineOnly(e.target.checked);
                    setLoading(true);
                  }}
                  color="warning"
                />
              }
              label={<Typography variant="body2">Của tôi</Typography>}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 1, flexShrink: 0 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box className="sales-chat-workspace">
          {/* Inbox */}
          <Box className="sales-chat-panel">
            <Box className="sales-chat-inbox__search">
              <TextField
                size="small"
                fullWidth
                placeholder="Tìm tên, SĐT, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box className="sales-chat-inbox__list">
              {loading ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <CircularProgress size={28} sx={{ color: "#ff7a00" }} />
                </Box>
              ) : filteredInbox.length === 0 ? (
                <Box className="sales-chat-empty">
                  <ForumIcon sx={{ fontSize: 40, color: "#cbd5e1", mb: 1 }} />
                  <Typography variant="body2">Chưa có hội thoại phù hợp</Typography>
                </Box>
              ) : (
                filteredInbox.map((c) => (
                  <div
                    key={c.id}
                    className={`sales-chat-inbox-item ${c.id === activeId ? "sales-chat-inbox-item--active" : ""}`}
                    onClick={() => setActiveId(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setActiveId(c.id)}
                  >
                    <Badge
                      badgeContent={c.unreadForSales > 0 ? c.unreadForSales : null}
                      color="error"
                      overlap="circular"
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: c.customerUserId ? "#ff7a00" : "#94a3b8",
                          fontSize: 14,
                        }}
                      >
                        {guestInitials(c.guestName)}
                      </Avatar>
                    </Badge>
                    <div className="sales-chat-inbox-item__body">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <div className="sales-chat-inbox-item__name">{conversationTitle(c)}</div>
                        <ChannelBadge channel={c.channel} />
                      </Box>
                      <div className="sales-chat-inbox-item__meta">{conversationMeta(c)}</div>
                      <div className="sales-chat-inbox-item__preview">{c.lastPreview || "—"}</div>
                    </div>
                    {c.lastMessageAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: "0.65rem" }}>
                        {formatTime(c.lastMessageAt)}
                      </Typography>
                    )}
                  </div>
                ))
              )}
            </Box>
          </Box>

          {/* Thread */}
          <Box className="sales-chat-panel">
            {!activeId ? (
              <Box className="sales-chat-empty">
                <SupportAgentIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Chọn một hội thoại
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Khách chat từ mục Thông tin → Chat với nhân viên
                </Typography>
              </Box>
            ) : (
              <>
                <Box className="sales-chat-thread-header">
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: "#ff7a00" }}>
                      {guestInitials(active?.guestName)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography fontWeight={700} variant="subtitle1">
                          {conversationTitle(active)}
                        </Typography>
                        {active?.channel && <ChannelBadge channel={active.channel} />}
                      </Box>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
                        {active?.customerUserId && (
                          <Chip
                            size="small"
                            icon={<PersonIcon sx={{ fontSize: "14px !important" }} />}
                            label={`KH#${active.customerUserId}`}
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {active?.guestPhone && (
                          <Chip
                            size="small"
                            icon={<PhoneIcon sx={{ fontSize: "14px !important" }} />}
                            label={active.guestPhone}
                            variant="outlined"
                          />
                        )}
                        {active?.guestEmail && (
                          <Chip
                            size="small"
                            icon={<EmailIcon sx={{ fontSize: "14px !important" }} />}
                            label={active.guestEmail}
                            variant="outlined"
                            sx={{ maxWidth: 220 }}
                          />
                        )}
                      </Box>
                      {active?.assignedSalesName && (
                        <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: "block" }}>
                          NV phụ trách: {active.assignedSalesName}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box className="sales-chat-messages">
                  {messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Chưa có tin nhắn
                    </Typography>
                  ) : (
                    messages.map((m) => <MessageBubble key={m.id} msg={m} />)
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                <Box className="sales-chat-quick">
                  {QUICK_REPLIES.map((q, i) => (
                    <Chip
                      key={i}
                      size="small"
                      label={q.length > 36 ? `${q.slice(0, 36)}…` : q}
                      onClick={() => setDraft(q)}
                      sx={{
                        flexShrink: 0,
                        bgcolor: "#fff",
                        border: "1px solid #e2e8f0",
                        "&:hover": { bgcolor: "#fff4eb" },
                      }}
                    />
                  ))}
                </Box>

                <Box sx={{ px: 2, py: 1, borderTop: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Gắn hoa hồng Chat (SALES_CHAT)
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Mã đơn ORD-..."
                      value={attribCode}
                      onChange={(e) => setAttribCode(e.target.value)}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!attribCode.trim() || attribLoading}
                      onClick={async () => {
                        setAttribLoading(true);
                        setAttribMsg("");
                        try {
                          await attributeOrderByCode(attribCode.trim(), "SALES_CHAT");
                          setAttribMsg("Đã gắn nguồn SALES_CHAT cho đơn");
                          setAttribCode("");
                        } catch (e) {
                          setAttribMsg(e.response?.data?.message || e.message || "Gắn nguồn thất bại");
                        } finally {
                          setAttribLoading(false);
                        }
                      }}
                    >
                      Gắn HH
                    </Button>
                  </Box>
                  {attribMsg && (
                    <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: "block" }}>
                      {attribMsg}
                    </Typography>
                  )}
                </Box>

                <Box className="sales-chat-compose">
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    size="small"
                    placeholder="Nhập tin nhắn gửi khách..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            color="primary"
                            onClick={handleSend}
                            disabled={!draft.trim() || sending}
                            sx={{
                              bgcolor: "#2563eb",
                              color: "#fff",
                              "&:hover": { bgcolor: "#1d4ed8" },
                              "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
                            }}
                          >
                            {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </>
            )}
          </Box>

        </Box>
      </Box>
    </AdminLayout>
  );
};

export default SalesOmnichannelPage;
