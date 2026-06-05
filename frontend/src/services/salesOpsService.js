import axios from "axios";
import { API_PREFIX } from "../config/api";
const api = axios.create({ baseURL: API_PREFIX });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function fetchPipeline(allStaff = false, salesUserId = null) {
  const params = { allStaff };
  if (salesUserId != null) params.salesUserId = salesUserId;
  const { data } = await api.get("/admin/sales/pipeline", { params });
  return data.data;
}

export async function updatePipelineStatus(orderId, pipelineStatus) {
  const { data } = await api.put(`/admin/sales/orders/${orderId}/pipeline-status`, {
    pipelineStatus,
  });
  return data.data;
}

export async function attributeOrderByCode(orderCode, orderSource = "SALES_CHAT") {
  const { data } = await api.put("/admin/sales/orders/attribution-by-code", {
    orderCode,
    orderSource,
  });
  return data.data;
}

export async function fetchMyKpi(year, month) {
  const { data } = await api.get("/admin/sales/my-kpi", { params: { year, month } });
  return data.data;
}

export async function fetchStaffKpi(year, month) {
  const { data } = await api.get("/admin/sales/staff-kpi", { params: { year, month } });
  return data.data;
}

export async function fetchSalesUsers() {
  const { data } = await api.get("/admin/sales/sales-users");
  return data.data;
}

export async function fetchKpiConfig() {
  const { data } = await api.get("/admin/sales/kpi-config");
  return data.data;
}

export async function updateKpiConfig(payload) {
  const { data } = await api.put("/admin/sales/kpi-config", payload);
  return data.data;
}

export const ORDER_SOURCE_LABELS = {
  WEB_ORGANIC: "Web tự nhiên",
  WEB_ASSIGNED: "Web → Sales",
  SALES_CHAT: "Tư vấn Chat",
  SALES_LINK: "Link giới thiệu",
  ADMIN_SALES: "Sales tạo đơn",
};
