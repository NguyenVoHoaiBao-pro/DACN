import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const ADMIN_API = `${API_PREFIX}/admin/products`;
const PUBLIC_API = `${API_PREFIX}/products`;

// ══════════════════════════════════════════════
// CUSTOMER APIs (Public — Không cần token)
// ══════════════════════════════════════════════

export const getProducts = async (page = 0, size = 10) => {
  const res = await httpClient.get(`${PUBLIC_API}?page=${page}&size=${size}`);
  return res.data;
};

export const getProductDetail = async (id) => {
  const res = await httpClient.get(`${PUBLIC_API}/${id}`);
  return res.data?.data;
};

export const searchProducts = async (params) => {
  const res = await httpClient.get(`${PUBLIC_API}/search`, { params });
  return res.data;
};

export const getProductsByCategory = async (productTypeId, page = 0, size = 10) => {
  const res = await httpClient.get(`${PUBLIC_API}/product-type/${productTypeId}?page=${page}&size=${size}`);
  return res.data;
};

export const getProductsByProducer = async (producerId, page = 0, size = 10) => {
  const res = await httpClient.get(`${PUBLIC_API}/producer/${producerId}?page=${page}&size=${size}`);
  return res.data;
};

export const getBestSellers = async (page = 0, size = 8) => {
  const res = await httpClient.get(`${PUBLIC_API}/best-sellers?page=${page}&size=${size}`);
  return res.data;
};

export const getFeaturedProducts = async (page = 0, size = 8) => {
  const res = await httpClient.get(`${PUBLIC_API}/featured?page=${page}&size=${size}`);
  return res.data;
};

export const getBrands = async () => {
  const res = await httpClient.get(`${PUBLIC_API}/brands`);
  return res.data;
};

export const getProductVariants = async (id) => {
  const res = await httpClient.get(`${PUBLIC_API}/${id}/variants`);
  return res.data;
};

// ══════════════════════════════════════════════
// ADMIN APIs (Protected — Cần token + quyền PRODUCT_MANAGE)
// ══════════════════════════════════════════════

export const adminGetProducts = async (params) => {
  const res = await httpClient.get(ADMIN_API, { params });
  return res.data;
};

export const adminGetProductDetail = async (id) => {
  const res = await httpClient.get(`${ADMIN_API}/${id}`);
  return res.data?.data;
};

export const adminCreateProduct = async (data) => {
  const res = await httpClient.post(ADMIN_API, data);
  return res.data;
};

export const adminUpdateProduct = async (id, data) => {
  const res = await httpClient.put(`${ADMIN_API}/${id}`, data);
  return res.data;
};

export const adminDeleteProduct = async (id) => {
  const res = await httpClient.delete(`${ADMIN_API}/${id}`);
  return res.data;
};

export const adminToggleProductStatus = async (id) => {
  const res = await httpClient.put(`${ADMIN_API}/${id}/toggle-status`);
  return res.data;
};

export const adminGetProductStats = async () => {
  const res = await httpClient.get(`${ADMIN_API}/stats`);
  return res.data;
};

export const adminAddVariant = async (productId, data) => {
  const res = await httpClient.post(`${ADMIN_API}/${productId}/variants`, data);
  return res.data;
};

export const adminUpdateVariant = async (productId, variantId, data) => {
  const res = await httpClient.put(`${ADMIN_API}/${productId}/variants/${variantId}`, data);
  return res.data;
};

export const adminDeleteVariant = async (productId, variantId) => {
  const res = await httpClient.delete(`${ADMIN_API}/${productId}/variants/${variantId}`);
  return res.data;
};

export const adminAddImage = async (productId, data) => {
  const res = await httpClient.post(`${ADMIN_API}/${productId}/images`, data);
  return res.data;
};

export const adminDeleteImage = async (productId, imageId) => {
  const res = await httpClient.delete(`${ADMIN_API}/${productId}/images/${imageId}`);
  return res.data;
};
