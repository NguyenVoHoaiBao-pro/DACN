/**
 * Chuẩn hóa payload login/register từ auth-service (ApiResponse.data).
 * Backend trả: accessToken, refreshToken, user (LoginProfile), roles[], permissions[]
 */
export function normalizeAuthUser(loginData) {
  if (!loginData) return null;

  const user = loginData.user || loginData;
  const roleNames = loginData.roles || user.roles?.map((r) => r.name || r) || [];
  const permissions = loginData.permissions || user.permissions || [];

  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles.map((r) =>
        typeof r === "string" ? { name: r } : r?.name ? r : { name: String(r) },
      )
    : roleNames.map((name) => ({ name: typeof name === "string" ? name : name?.name || String(name) }));

  return {
    ...user,
    roles,
    permissions: Array.isArray(permissions) ? permissions : [],
  };
}

const LIVE_CHAT_SESSION_KEY = "electro_live_chat_session";

export function persistAuthSession(loginData) {
  // Phiên chat cũ (Khách web) — tạo lại sau login để Sales thấy đúng tên KH
  try {
    sessionStorage.removeItem(LIVE_CHAT_SESSION_KEY);
  } catch {
    /* ignore */
  }
  const token = loginData?.accessToken || loginData?.token;
  if (token) {
    localStorage.setItem("token", token);
  }
  if (loginData?.refreshToken) {
    localStorage.setItem("refreshToken", loginData.refreshToken);
  }
  const user = normalizeAuthUser(loginData);
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
  return { token, user };
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function isCustomerUser(user) {
  if (!user?.roles) return true;
  return user.roles.some(
    (r) => {
      const name = r.name || r;
      return name === "ROLE_CUSTOMER" || name === "CUSTOMER";
    },
  );
}

/** Sau login thành công: lưu session + trả user đã chuẩn hóa */
export function applyLoginResponse(loginData) {
  return persistAuthSession(loginData);
}
