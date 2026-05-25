import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const BASE_URL = `${API_PREFIX}/admin/statistics`;

/** Admin statistics trả raw DTO (không bọc ApiResponse) */
const unwrap = (res) => res.data?.data ?? res.data;

export const getOverviewStats = async () => unwrap(await httpClient.get(`${BASE_URL}/overview`));

export const getRevenueChart = async (period = "month", startDate, endDate) => {
  const params = { period };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return unwrap(await httpClient.get(`${BASE_URL}/revenue/chart`, { params }));
};

export const getOrderStatusStats = async () => unwrap(await httpClient.get(`${BASE_URL}/orders/by-status`));

export const getTopProductStats = async (type = "best-selling", limit = 10) =>
  unwrap(await httpClient.get(`${BASE_URL}/top-products`, { params: { type, limit } }));

export const getRecentOrdersStats = async (limit = 10) =>
  unwrap(await httpClient.get(`${BASE_URL}/orders/recent`, { params: { limit } }));

export const getPaymentMethodStats = async () => unwrap(await httpClient.get(`${BASE_URL}/payment-methods`));

export const getConversionRates = async () => unwrap(await httpClient.get(`${BASE_URL}/conversion-rate`));

export const getCustomerSegments = async () => unwrap(await httpClient.get(`${BASE_URL}/customer-segments`));

export const getRevenue = async (params) => unwrap(await httpClient.get(`${BASE_URL}/revenue`, { params }));

export const getTopProductsLegacy = async () => unwrap(await httpClient.get(`${BASE_URL}/top-products-legacy`));

// Aliases / legacy names
export const getOverview = getOverviewStats;
export const getTopProducts = getTopProductStats;
