import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const RETURNS_API = `${API_PREFIX}/admin/inventory/returns`;
const ORDER_RETURN_API = `${API_PREFIX}/admin/orders/return-context`;

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const fetchProductReturns = async (status = null) => {
  const params = status ? { status } : {};
  const res = await httpClient.get(RETURNS_API, { params, headers: headers() });
  return res.data;
};

export const lookupProductReturn = async (keyword) => {
  const res = await httpClient.get(`${RETURNS_API}/lookup`, {
    params: { keyword },
    headers: headers(),
  });
  return res.data;
};

export const lookupOrderReturnContext = async (keyword) => {
  const res = await httpClient.get(ORDER_RETURN_API, {
    params: { keyword },
    headers: headers(),
  });
  return res.data;
};

export const fetchProductReturnDetail = async (id) => {
  const res = await httpClient.get(`${RETURNS_API}/${id}`, { headers: headers() });
  return res.data;
};

export const openProductReturn = async (payload) => {
  const res = await httpClient.post(RETURNS_API, payload, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const processProductReturn = async (id, payload) => {
  const res = await httpClient.post(`${RETURNS_API}/${id}/process`, payload, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};
