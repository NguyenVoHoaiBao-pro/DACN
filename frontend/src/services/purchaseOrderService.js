import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const PO_API = `${API_PREFIX}/admin/purchase-orders`;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

/** PO đã nhập kho — chờ quét IMEI */
/** Thu mua — tạo PO mới (trạng thái PENDING) */
export const createPurchaseOrder = async (payload) => {
  const res = await httpClient.post(PO_API, payload, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const fetchPoImeiQueue = async () => {
  const res = await httpClient.get(`${PO_API}/warehouse/imei-queue`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/** Danh sách PO chờ kho xử lý (Màn hình 1) */
export const fetchWarehousePoQueue = async (q = "") => {
  const res = await httpClient.get(`${PO_API}/warehouse/queue`, {
    params: q ? { q } : {},
    headers: getAuthHeaders(),
  });
  return res.data;
};

/** Chi tiết PO (Màn hình 2) */
export const fetchPoDetail = async (id) => {
  const res = await httpClient.get(`${PO_API}/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/** Bắt đầu kiểm đếm — chuyển trạng thái RECEIVING */
export const startPoReceiving = async (id) => {
  const res = await httpClient.post(`${PO_API}/${id}/start-receiving`, null, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/** Xem trước sai lệch trước khi xác nhận (Màn hình 3) */
export const previewPoReceive = async (id, payload) => {
  const res = await httpClient.post(`${PO_API}/${id}/preview-receive`, payload, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return res.data;
};

/** Xác nhận nhập kho (Màn hình 4) */
export const confirmPoReceive = async (id, payload) => {
  const res = await httpClient.post(`${PO_API}/${id}/confirm-receive`, payload, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const fetchAdminPoList = async () => {
  const res = await httpClient.get(`${PO_API}/admin/all`, { headers: getAuthHeaders() });
  return res.data;
};

export const fetchPendingPoList = async () => {
  const res = await httpClient.get(`${PO_API}/admin/pending`, { headers: getAuthHeaders() });
  return res.data;
};

export const approvePurchaseOrder = async (id, payload = {}) => {
  const res = await httpClient.post(`${PO_API}/${id}/approve`, payload, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const rejectPurchaseOrder = async (id, payload = {}) => {
  const res = await httpClient.post(`${PO_API}/${id}/reject`, payload, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const markPoInTransit = async (id) => {
  const res = await httpClient.post(`${PO_API}/${id}/mark-in-transit`, null, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const fetchPoStockLots = async (poId) => {
  const res = await httpClient.get(`${PO_API}/${poId}/stock-lots`, { headers: getAuthHeaders() });
  return res.data;
};

export const fetchLotBySerial = async (serial) => {
  const res = await httpClient.get(`${PO_API}/stock-lots/by-serial/${encodeURIComponent(serial)}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};
