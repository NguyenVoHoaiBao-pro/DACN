import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const BASE = `${API_PREFIX}/admin/sales-consultation`;

/** Tra cứu theo tên, SKU hoặc IMEI/Serial (Sales read-only) */
export const salesLookupProduct = async (keyword) => {
  const { data } = await httpClient.get(`${BASE}/lookup`, { params: { keyword } });
  return data;
};

export const salesGetConsultationDetail = async (productId) => {
  const { data } = await httpClient.get(`${BASE}/products/${productId}`);
  return data;
};
