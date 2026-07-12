/**
 * Cấu hình API — mọi request frontend đi qua API Gateway microservices.
 *
 * Dev (npm run dev):
 *   - Dùng đường dẫn tương đối /api → Vite proxy → http://localhost:8080
 *   - Hoạt động với CẢ http://localhost:5173 VÀ http://<IP-LAN>:5173
 *
 * Production: set VITE_API_URL trong frontend/.env (vd. https://api.yourshop.com)
 */
function resolveApiBaseUrl() {
  if (import.meta.env.DEV) {
    return "";
  }

  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  return "http://localhost:8080";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_PREFIX = import.meta.env.DEV ? "/api" : `${API_BASE_URL}/api`;

/** AI recommendation Python service (optional) */
export const AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL?.replace(/\/$/, "") || "http://localhost:5003";
