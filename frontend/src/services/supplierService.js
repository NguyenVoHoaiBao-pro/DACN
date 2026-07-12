import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/admin/suppliers`;

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const fetchSuppliers = async () => {
  const res = await httpClient.get(API, { headers: headers() });
  return res.data;
};
