import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = API_PREFIX;

// Helper to get auth header (token should be stored in localStorage)
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * ==========================================
 * Group 1: Admin Management
 * ==========================================
 */

/**
 * GET /api/admin/coupons - List coupons with pagination, search, and sorting
 * @param {Object} params - { page, size, keyword, isActive, sortBy, sortDir }
 */
export const adminGetCoupons = async (params = {}) => {
  const res = await httpClient.get(`${API}/admin/coupons`, {
    params,
    headers: getAuthHeader(),
  });
  return res.data?.data;
};

/**
 * GET /api/admin/coupons/{id} - Get detail
 */
export const adminGetCouponById = async (id) => {
  const res = await httpClient.get(`${API}/admin/coupons/${id}`, {
    headers: getAuthHeader(),
  });
  return res.data?.data;
};

/**
 * POST /api/admin/coupons - Create new coupon
 */
export const adminCreateCoupon = async (couponData) => {
  const res = await httpClient.post(`${API}/admin/coupons`, couponData, {
    headers: getAuthHeader(),
  });
  return res.data?.data;
};

/**
 * PUT /api/admin/coupons/{id} - Update coupon
 */
export const adminUpdateCoupon = async (id, couponData) => {
  const res = await httpClient.put(`${API}/admin/coupons/${id}`, couponData, {
    headers: getAuthHeader(),
  });
  return res.data?.data;
};

/**
 * PATCH /api/admin/coupons/{id}/toggle - Toggle status
 */
export const adminToggleCouponStatus = async (id) => {
  const res = await httpClient.patch(`${API}/admin/coupons/${id}/toggle`, {}, {
    headers: getAuthHeader(),
  });
  return res.data?.data;
};

/**
 * DELETE /api/admin/coupons/{id} - Soft delete
 */
export const adminDeleteCoupon = async (id) => {
  const res = await httpClient.delete(`${API}/admin/coupons/${id}`, {
    headers: getAuthHeader(),
  });
  return res.data?.data;
};

/**
 * ==========================================
 * Group 2: User APIs
 * ==========================================
 */

/**
 * GET /api/coupons - Get available coupons for customers
 */
export const getAvailableCoupons = async () => {
  const res = await httpClient.get(`${API}/coupons`);
  return res.data?.data;
};

/**
 * GET /api/orders/preview-coupon?code=...
 * @param {string} code 
 */
export const previewCoupon = async (code) => {
  const res = await httpClient.get(`${API}/orders/preview-coupon`, {
    params: { code }
  });
  return res.data?.data;
};

