import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";
import { isApiSuccess } from "../utils/apiResponse";

const API = `${API_PREFIX}/admin/posts`;

export const getPosts = async (params = {}) => {
  const res = await httpClient.get(API, { params });
  const body = res.data;
  if (!isApiSuccess(body)) {
    throw new Error(body?.message || "Không tải được danh sách bài viết");
  }
  return body.data;
};

export const getPostById = async (id) => {
  const res = await httpClient.get(`${API}/${id}`);
  const body = res.data;
  if (!isApiSuccess(body)) throw new Error(body?.message || "Không tải được bài viết");
  return body.data;
};

export const createPost = async (data) => {
  const res = await httpClient.post(API, data);
  return res.data;
};

export const updatePost = async (id, data) => {
  const res = await httpClient.put(`${API}/${id}`, data);
  return res.data;
};

export const deletePost = async (id) => {
  const res = await httpClient.delete(`${API}/${id}`);
  return res.data;
};
