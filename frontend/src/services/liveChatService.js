import { API_PREFIX } from "../config/api";

const GUEST_KEY = "electro_live_chat_session";

export function getGuestSessionToken() {
  return sessionStorage.getItem(GUEST_KEY);
}

export function setGuestSessionToken(token) {
  if (token) sessionStorage.setItem(GUEST_KEY, token);
  else sessionStorage.removeItem(GUEST_KEY);
}

/** Lấy thông tin khách từ Redux/localStorage để Sales nhận diện */
export function buildLiveChatCustomerProfile(user) {
  if (!user?.id) {
    return {
      guestName: "Khách web (chưa đăng nhập)",
      guestPhone: undefined,
      guestEmail: undefined,
    };
  }
  const name =
    (user.name && String(user.name).trim()) ||
    (user.username && String(user.username).trim()) ||
    (user.email && String(user.email).split("@")[0]) ||
    `Khách #${user.id}`;
  return {
    guestName: name,
    guestPhone: user.phone || undefined,
    guestEmail: user.email || undefined,
    customerUserId: user.id,
  };
}

export async function startLiveChatSession(profile = {}, initialMessage) {
  const token = localStorage.getItem("token");
  const url = token
    ? `${API_PREFIX}/live-chat/sessions`
    : `${API_PREFIX}/live-chat/guest/sessions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      guestName: profile.guestName,
      guestPhone: profile.guestPhone,
      guestEmail: profile.guestEmail,
      initialMessage,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Không tạo được phiên chat");
  const data = json.data;
  setGuestSessionToken(data.sessionToken);
  return data;
}

export async function startGuestSession(opts = {}) {
  return startLiveChatSession(
    { guestName: opts.guestName, guestPhone: opts.guestPhone, guestEmail: opts.guestEmail },
    opts.initialMessage
  );
}

export async function guestSendMessage(sessionToken, body) {
  const res = await fetch(`${API_PREFIX}/live-chat/guest/sessions/${sessionToken}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gửi tin thất bại");
  return json.data;
}

export async function guestPollMessages(sessionToken, afterId) {
  const q = afterId ? `?afterId=${afterId}` : "";
  const res = await fetch(`${API_PREFIX}/live-chat/guest/sessions/${sessionToken}/messages${q}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Không tải tin nhắn");
  return json.data || [];
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAdminInbox(mineOnly = false) {
  const res = await fetch(`${API_PREFIX}/admin/live-chat/conversations?mineOnly=${mineOnly}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Không tải hội thoại");
  return json.data || [];
}

export async function fetchConversationDetail(id) {
  const res = await fetch(`${API_PREFIX}/admin/live-chat/conversations/${id}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Không tải chi tiết");
  return json.data;
}

export async function salesReply(conversationId, body) {
  const res = await fetch(`${API_PREFIX}/admin/live-chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gửi tin thất bại");
  return json.data;
}
