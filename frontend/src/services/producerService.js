import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API_ADMIN = `${API_PREFIX}/admin/producers`;
const API_PUBLIC = `${API_PREFIX}/producers`;

/**
 * Admin: Get paginated list of producers
 */
export const adminGetProducers = async (params) => {
  const res = await httpClient.get(`${API_ADMIN}`, { params });
  return res.data?.data;
};

/**
 * Admin: Get all producers (slim for dropdowns)
 */
export const adminGetAllProducersSlim = async () => {
  const res = await httpClient.get(`${API_ADMIN}/all`);
  return res.data?.data;
};

/**
 * Admin: Create a new producer
 */
export const adminCreateProducer = async (producerData) => {
  const res = await httpClient.post(`${API_ADMIN}`, producerData);
  return res.data;
};

/**
 * Admin: Update an existing producer
 */
export const adminUpdateProducer = async (id, producerData) => {
  const res = await httpClient.put(`${API_ADMIN}/${id}`, producerData);
  return res.data;
};

/**
 * Admin: Toggle producer active status
 */
export const adminToggleProducerStatus = async (id) => {
  const res = await httpClient.patch(`${API_ADMIN}/${id}/toggle-status`);
  return res.data;
};

/**
 * Admin: Delete a producer (Smart Delete)
 */
export const adminDeleteProducer = async (id) => {
  const res = await httpClient.delete(`${API_ADMIN}/${id}`);
  return res.data;
};

/**
 * Public: Get active producers for filters
 */
export const publicGetActiveProducers = async () => {
  const res = await httpClient.get(`${API_PUBLIC}`);
  return res.data?.data;
};
