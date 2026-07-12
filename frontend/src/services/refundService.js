import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const REFUNDS_API = `${API_PREFIX}/admin/refunds`;

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const fetchRefunds = async (status = null, paymentMethod = null) => {
  const params = {};
  if (status) params.status = status;
  if (paymentMethod) params.paymentMethod = paymentMethod;
  const res = await httpClient.get(REFUNDS_API, { params, headers: headers() });
  return res.data;
};

export const fetchRefundDetail = async (id) => {
  const res = await httpClient.get(`${REFUNDS_API}/${id}`, { headers: headers() });
  return res.data;
};

export const fetchRefundVoucher = async (id) => {
  const res = await httpClient.get(`${REFUNDS_API}/${id}/voucher`, { headers: headers() });
  return res.data;
};

export const updateRefundBankInfo = async (id, payload) => {
  const res = await httpClient.put(`${REFUNDS_API}/${id}/bank-info`, payload, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};

/** VNPay / MoMo / ZaloPay */
export const approveRefundGateway = async (id, payload = {}) => {
  const res = await httpClient.put(`${REFUNDS_API}/${id}/approve`, payload, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};

/** COD — multipart với biên lai */
export const confirmCodRefund = async (id, formData) => {
  const res = await httpClient.post(`${REFUNDS_API}/${id}/confirm-cod`, formData, {
    headers: { ...headers(), "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const rejectRefund = async (id, reason) => {
  const res = await httpClient.put(`${REFUNDS_API}/${id}/reject`, { reason }, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const retryRefundGateway = async (id) => {
  const res = await httpClient.put(`${REFUNDS_API}/${id}/retry`, null, {
    headers: headers(),
  });
  return res.data;
};

export const fetchRefundAuditLogs = async (id) => {
  const res = await httpClient.get(`${REFUNDS_API}/${id}/audit-logs`, { headers: headers() });
  return res.data;
};

export const checkRefundGatewayBalance = async (id) => {
  const res = await httpClient.get(`${REFUNDS_API}/${id}/gateway-balance`, { headers: headers() });
  return res.data;
};

export const napasLookup = async (bankName, bankAccount) => {
  const res = await httpClient.post(`${REFUNDS_API}/napas-lookup`, { bankName, bankAccount }, {
    headers: { ...headers(), "Content-Type": "application/json" },
  });
  return res.data;
};

export const paymentMethodTag = (method) => {
  if (!method) return "—";
  if (method === "COD" || method === "BANK_TRANSFER") return "Tiền mặt/COD";
  if (method === "VNPAY") return "VNPay";
  if (method === "MOMO") return "MoMo";
  if (method === "ZALOPAY") return "ZaloPay";
  return method;
};

export const paymentMethodChipColor = (method) => {
  if (method === "VNPAY" || method === "MOMO" || method === "ZALOPAY") return "primary";
  return "warning";
};
