import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = API_PREFIX;

// ── Placeholder image (inline SVG data URI) ────────────────────────
// Dùng thay thế via.placeholder.com vì domain đó không còn hoạt động
export const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

/**
 * GET /api/categories — Danh sách danh mục (public)
 */
export const getCategories = async () => {
  const res = await httpClient.get(`${API}/categories`);
  return res.data?.data;
};

/**
 * GET /api/admin/categories/all — Danh sách danh mục (admin)
 * Fallback: dùng API public nếu admin endpoint lỗi
 */
export const adminGetCategories = async () => {
  try {
    const res = await httpClient.get(`${API}/admin/categories/all`);
    return res.data?.data;
  } catch (error) {
    console.warn("Admin categories API failed, falling back to public API:", error.message);
    try {
      const fallback = await httpClient.get(`${API}/categories`);
      const data = fallback.data?.data;
      return Array.isArray(data) ? data : data?.content || [];
    } catch (fallbackErr) {
      console.error("Public categories API also failed:", fallbackErr.message);
      return [];
    }
  }
};

/**
 * GET /api/categories/root — Menu đa cấp (Mega Menu)
 */
export const getCategoryTree = async () => {
  try {
    const res = await httpClient.get(`${API}/categories/root`);
    return res.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch category tree:", error);
    return [];
  }
};

/**
 * GET /api/categories/home — Trang chủ (Category + Top Products)
 */
export const getHomeCategories = async () => {
  try {
    const res = await httpClient.get(`${API}/categories/home`);
    return res.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch home categories:", error);
    return [];
  }
};

/**
 * PATCH /api/admin/categories/{id}/toggle-status
 */
export const adminToggleCategoryStatus = async (id) => {
  const res = await httpClient.patch(`${API}/admin/categories/${id}/toggle-status`);
  return res.data ?? res;
};

/**
 * POST /api/admin/categories — Tạo mới
 */
export const adminCreateCategory = async (data) => {
  const res = await httpClient.post(`${API}/admin/categories`, data);
  return res.data;
};

/**
 * PUT /api/admin/categories/{id} — Cập nhật
 */
export const adminUpdateCategory = async (id, data) => {
  const res = await httpClient.put(`${API}/admin/categories/${id}`, data);
  return res.data;
};

/**
 * GET /api/producers — Danh sách nhà sản xuất (public)
 */
export const getProducers = async () => {
  const res = await httpClient.get(`${API}/producers`);
  return res.data?.data;
};

/**
 * GET /api/admin/producers/all — Danh sách nhà sản xuất (admin)
 * Fallback: dùng API public nếu admin endpoint lỗi
 */
export const adminGetProducers = async () => {
  try {
    const res = await httpClient.get(`${API}/admin/producers/all`);
    return res.data?.data;
  } catch (error) {
    console.warn("Admin producers API failed, falling back to public API:", error.message);
    try {
      const fallback = await httpClient.get(`${API}/producers`);
      const data = fallback.data?.data;
      return Array.isArray(data) ? data : data?.content || [];
    } catch (fallbackErr) {
      console.error("Public producers API also failed:", fallbackErr.message);
      return [];
    }
  }
};

/**
 * GET /api/admin/coupons/active — Danh sách coupon còn hạn
 */
export const adminGetActiveCoupons = async () => {
  try {
    const res = await httpClient.get(`${API}/admin/coupons/active`);
    return res.data?.data;
  } catch (error) {
    console.warn("Admin coupons API failed:", error.message);
    return []; // Coupon không bắt buộc, trả về mảng rỗng
  }
};

/**
 * GET /api/admin/attribute-values — Danh sách tất cả Attribute Values
 * Dùng để hiển thị checkbox khi tạo/sửa biến thể sản phẩm
 * Fallback: trả về null (FE sẽ extract từ variants có sẵn)
 */
export const adminGetAttributeValues = async () => {
  try {
    const res = await httpClient.get(`${API}/admin/attribute-values`);
    return res.data?.data || [];
  } catch (error) {
    console.warn("Attribute values API not available:", error.message);
    return null; // Signal FE to use fallback
  }
};
