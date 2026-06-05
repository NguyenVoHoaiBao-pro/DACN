/**
 * Cấu hình API — mọi request frontend đi qua API Gateway microservices.
 * Dev: http://localhost:8080  |  Production: set VITE_API_URL trong .env
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export const API_PREFIX = `${API_BASE_URL}/api`;

/** AI recommendation Python service (optional) */
export const AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL?.replace(/\/$/, "") || "http://localhost:5003";
