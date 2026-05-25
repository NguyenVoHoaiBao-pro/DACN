import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { clearAuthSession } from "../utils/authSession";

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

const RETRYABLE = new Set([502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (config && !config.__skipRetry) {
      const retryCount = config.__retryCount || 0;
      const isRetryable =
        RETRYABLE.has(status) ||
        (!error.response && error.code === "ECONNABORTED");

      if (isRetryable && retryCount < MAX_RETRIES) {
        if (config.signal?.aborted) {
          return Promise.reject(error);
        }
        config.__retryCount = retryCount + 1;
        await sleep(RETRY_DELAY_MS * config.__retryCount);
        return httpClient(config);
      }
    }

    if (status === 401) {
      const url = config?.url || "";
      const isAuthEndpoint = url.includes("/api/auth/login") || url.includes("/api/auth/register");
      if (!isAuthEndpoint) {
        clearAuthSession();
      }
    }

    return Promise.reject(error);
  },
);

export default httpClient;
