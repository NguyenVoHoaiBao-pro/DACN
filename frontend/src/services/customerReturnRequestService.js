import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/orders/return-requests`;
const ADMIN_API = `${API_PREFIX}/admin/orders/return-requests`;

export const RETURN_REASON_OPTIONS = [
  { value: "CHANGE_OF_MIND", label: "Đổi ý / không muốn giữ" },
  { value: "COLOR_ISSUE", label: "Không thích màu / kiểu dáng" },
  { value: "WRONG_PRODUCT", label: "Sai mẫu / sai sản phẩm" },
  { value: "MINOR_DAMAGE", label: "Trầy xước nhẹ / lỗi ngoại quan" },
  { value: "MISSING_ACCESSORY", label: "Thiếu phụ kiện" },
  { value: "OTHER", label: "Lý do khác" },
];

export const RETURN_STATUS_COLOR = {
  PENDING_SALES_REVIEW: "warning",
  APPROVED: "info",
  REJECTED: "error",
  SHIPPED_BY_CUSTOMER: "primary",
  RECEIVED_AT_WAREHOUSE: "success",
  CANCELLED: "default",
  EXPIRED: "error",
};

export const createReturnRequest = async (payload) => {
  const res = await httpClient.post(API, payload);
  return res.data;
};

export const fetchMyReturnRequests = async () => {
  const res = await httpClient.get(`${API}/mine`);
  return res.data;
};

export const fetchMyReturnRequestDetail = async (id) => {
  const res = await httpClient.get(`${API}/mine/${id}`);
  return res.data;
};

export const markReturnRequestShipped = async (id, returnTrackingCode) => {
  const res = await httpClient.post(`${API}/mine/${id}/ship`, {
    returnTrackingCode: returnTrackingCode || undefined,
  });
  return res.data;
};

export const cancelReturnRequest = async (id) => {
  const res = await httpClient.post(`${API}/mine/${id}/cancel`);
  return res.data;
};

export const fetchAdminReturnRequests = async (status) => {
  const params = status ? { status } : {};
  const res = await httpClient.get(ADMIN_API, { params });
  return res.data;
};

export const fetchAdminReturnRequestDetail = async (id) => {
  const res = await httpClient.get(`${ADMIN_API}/${id}`);
  return res.data;
};

export const approveReturnRequest = async (id, salesResponseNote) => {
  const res = await httpClient.post(`${ADMIN_API}/${id}/approve`, {
    salesResponseNote: salesResponseNote || undefined,
  });
  return res.data;
};

export const rejectReturnRequest = async (id, rejectionReason, salesResponseNote) => {
  const res = await httpClient.post(`${ADMIN_API}/${id}/reject`, {
    rejectionReason,
    salesResponseNote: salesResponseNote || undefined,
  });
  return res.data;
};
