import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/cart`;

/**
 * Cart Service — gọi backend Cart API qua API Gateway
 * Tất cả endpoint yêu cầu JWT token (httpClient tự gắn Bearer)
 */

/** GET /api/cart — Lấy giỏ hàng hiện tại */
export const fetchCart = async () => {
  const res = await httpClient.get(API);
  return res.data?.data;
};

/** POST /api/cart — Thêm sản phẩm vào giỏ */
export const addItemToCart = async (variantId, quantity = 1) => {
  const res = await httpClient.post(API, {
    variantId: Number(variantId),
    quantity: Number(quantity),
  });
  return res.data?.data;
};

/** PUT /api/cart/{cartItemId} — Cập nhật số lượng */
export const updateCartItem = async (cartItemId, quantity) => {
  const res = await httpClient.put(`${API}/${cartItemId}`, { quantity: Number(quantity) });
  return res.data?.data;
};

/** DELETE /api/cart/{cartItemId} — Xoá 1 item */
export const removeCartItem = async (cartItemId) => {
  const res = await httpClient.delete(`${API}/${cartItemId}`);
  return res.data?.data;
};

/** DELETE /api/cart — Xoá toàn bộ giỏ */
export const clearCartAPI = async () => {
  const res = await httpClient.delete(API);
  return res.data?.data;
};
