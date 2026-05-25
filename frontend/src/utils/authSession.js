/**
 * Chuẩn hóa payload login/register từ auth-service (ApiResponse.data).
 * Backend trả: accessToken, refreshToken, user (LoginProfile), roles[], permissions[]
 */
export function normalizeAuthUser(loginData) {
  if (!loginData) return null;

  const user = loginData.user || loginData;
  const roleNames = loginData.roles || user.roles?.map((r) => r.name || r) || [];
  const permissions = loginData.permissions || user.permissions || [];

  const roles = Array.isArray(user.roles)
    ? user.roles
    : roleNames.map((name) => ({ name: typeof name === "string" ? name : name.name }));

  return {
    ...user,
    roles,
    permissions: Array.isArray(permissions) ? permissions : [],
  };
}

export function persistAuthSession(loginData) {
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
