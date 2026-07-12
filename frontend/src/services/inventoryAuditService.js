import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/admin/inventory-audits`;

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const fetchInventoryAudits = async () => {
  const res = await httpClient.get(API, { headers: headers() });
  return res.data;
};

export const fetchInventoryAuditDetail = async (id) => {
  const res = await httpClient.get(`${API}/${id}`, { headers: headers() });
  return res.data;
};

export const createInventoryAudit = async (payload) => {
  const res = await httpClient.post(API, payload, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const scanInventoryAudit = async (id, serialNumber) => {
  const res = await httpClient.post(
    `${API}/${id}/scan`,
    { serialNumber },
    { headers: { ...headers(), "Content-Type": "application/json" } },
  );
  return res.data;
};

export const bulkScanInventoryAudit = async (id, serialNumbers) => {
  const res = await httpClient.post(
    `${API}/${id}/scan-bulk`,
    { serialNumbers },
    { headers: { ...headers(), "Content-Type": "application/json" } },
  );
  return res.data;
};

export const fetchInventoryAuditProgress = async (id) => {
  const res = await httpClient.get(`${API}/${id}/counting-progress`, { headers: headers() });
  return res.data;
};

export const completeInventoryAudit = async (id) => {
  const res = await httpClient.post(`${API}/${id}/complete`, null, { headers: headers() });
  return res.data;
};

export const submitInventoryAudit = async (id, notes) => {
  const res = await httpClient.post(
    `${API}/${id}/submit`,
    { notes },
    { headers: { ...headers(), "Content-Type": "application/json" } },
  );
  return res.data;
};

export const approveInventoryAudit = async (id) => {
  const res = await httpClient.post(`${API}/${id}/approve`, null, { headers: headers() });
  return res.data;
};

export const rejectInventoryAudit = async (id, adminNote) => {
  const res = await httpClient.post(
    `${API}/${id}/reject`,
    { adminNote },
    { headers: { ...headers(), "Content-Type": "application/json" } },
  );
  return res.data;
};
