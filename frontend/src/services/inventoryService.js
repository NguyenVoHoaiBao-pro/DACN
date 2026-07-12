import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const ADMIN_INVENTORY_API = `${API_PREFIX}/admin/inventory`;

/**
 * Helper: lấy admin token từ localStorage
 */
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

// ═══════════════════════════════════════════════════════════════════════════════
// API 1 — Tìm Kiếm Variant (Autocomplete)
// GET /api/admin/inventory/variants/search?q={keyword}
// ═══════════════════════════════════════════════════════════════════════════════
export const searchVariants = async (keyword) => {
  const res = await httpClient.get(`${ADMIN_INVENTORY_API}/variants/search`, {
    params: { q: keyword },
    headers: getAuthHeaders(),
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 2 — Nhập IMEI Thủ Công (Textarea / Quét Súng)
// POST /api/admin/inventory/imei
// ═══════════════════════════════════════════════════════════════════════════════
export const importImeis = async (data) => {
  const res = await httpClient.post(`${ADMIN_INVENTORY_API}/imei`, data, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

// Alias cũ cho backward compatibility
export const assignImeis = importImeis;

// ═══════════════════════════════════════════════════════════════════════════════
// API 3 — Upload File Excel Nhập IMEI Hàng Loạt
// POST /api/admin/inventory/imei/upload-excel
// ═══════════════════════════════════════════════════════════════════════════════
export const uploadImeiExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await httpClient.post(`${ADMIN_INVENTORY_API}/imei/upload-excel`, formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 5 — Báo Cáo Tồn Kho
// GET /api/admin/inventory/stats?lowStockThreshold={n}
// ═══════════════════════════════════════════════════════════════════════════════
export const getLowStockStats = async (threshold = 10) => {
  const res = await httpClient.get(`${ADMIN_INVENTORY_API}/stats`, {
    params: { lowStockThreshold: threshold },
    headers: getAuthHeaders(),
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Lập phiếu nhập kho (Legacy)
// POST /api/admin/inventory/import
// ═══════════════════════════════════════════════════════════════════════════════
export const createStockImport = async (data) => {
  const res = await httpClient.post(`${ADMIN_INVENTORY_API}/import`, data, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Xử lý Hàng trả lại (Stock Return)
// POST /api/admin/inventory/return
// ═══════════════════════════════════════════════════════════════════════════════
export const processStockReturn = async (data) => {
  const res = await httpClient.post(`${ADMIN_INVENTORY_API}/return`, data, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 6 — Xem lịch sử biến động kho (Audit Transaction)
// GET /api/admin/inventory/transactions
// ═══════════════════════════════════════════════════════════════════════════════
export const getInventoryTransactions = async () => {
  const res = await httpClient.get(`${ADMIN_INVENTORY_API}/transactions`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const fetchFifoSerials = async (variantId, limit = 20) => {
  const res = await httpClient.get(`${ADMIN_INVENTORY_API}/serials/fifo`, {
    params: { variantId, limit },
    headers: getAuthHeaders(),
  });
  return res.data;
};
