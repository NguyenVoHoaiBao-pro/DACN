import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/admin`;

export const adminGetAttributes = async () => {
  const res = await httpClient.get(`${API}/attributes`);
  return res.data?.data;
};

export const adminCreateAttribute = async (name) => {
  const res = await httpClient.post(`${API}/attributes`, { name });
  return res.data;
};

export const adminUpdateAttribute = async (id, name) => {
  const res = await httpClient.put(`${API}/attributes/${id}`, { name });
  return res.data;
};

export const adminDeleteAttribute = async (id) => {
  const res = await httpClient.delete(`${API}/attributes/${id}`);
  return res.data;
};

export const adminGetAttributeValuesByAttrId = async (attributeId) => {
  const res = await httpClient.get(`${API}/attributes/${attributeId}/values`);
  return res.data?.data;
};

export const adminCreateAttributeValue = async (attributeId, value) => {
  const res = await httpClient.post(`${API}/attribute-values`, { attributeId, value });
  return res.data;
};

export const adminUpdateAttributeValue = async (id, attributeId, value) => {
  const res = await httpClient.put(`${API}/attribute-values/${id}`, { attributeId, value });
  return res.data;
};

export const adminDeleteAttributeValue = async (id) => {
  const res = await httpClient.delete(`${API}/attribute-values/${id}`);
  return res.data;
};
