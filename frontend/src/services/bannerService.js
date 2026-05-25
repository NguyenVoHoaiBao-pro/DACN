import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/admin/banners`;

export const getBanners = async () => {
  const res = await httpClient.get(API);
  return res.data?.data ?? [];
};

export const createBanner = async (data) => {
  const res = await httpClient.post(API, data);
  return res.data;
};

export const updateBanner = async (id, data) => {
  const res = await httpClient.put(`${API}/${id}`, data);
  return res.data;
};

export const toggleBannerStatus = async (id) => {
  const res = await httpClient.patch(`${API}/${id}/toggle-status`);
  return res.data;
};

export const deleteBanner = async (id) => {
  const res = await httpClient.delete(`${API}/${id}`);
  return res.data;
};
