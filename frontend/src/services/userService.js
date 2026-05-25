import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = API_PREFIX;

// Helper to get auth header (token should be stored in localStorage)
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * ==========================================
 * Group 1: Admin Management (Dashboard)
 * ==========================================
 */

/**
 * GET /api/admin/users - List users with pagination, search, and sorting
 * @param {Object} params - { page, size, keyword, sortBy, sortDir }
 */
export const adminGetUsers = async (params = {}) => {
  const res = await httpClient.get(`${API}/admin/users`, {
    params,
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * PUT /api/admin/users/{id}/status - Toggle account status (Lock/Unlock)
 */
export const adminToggleUserStatus = async (id) => {
  const res = await httpClient.put(`${API}/admin/users/${id}/status`, {}, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * POST /api/admin/users - Create new user account
 */
export const adminCreateUser = async (userData) => {
  const res = await httpClient.post(`${API}/admin/users`, userData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * PUT /api/admin/users/{id} - Update user account information
 */
export const adminUpdateUser = async (id, userData) => {
  const res = await httpClient.put(`${API}/admin/users/${id}`, userData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * ==========================================
 * Group 2: Personal (My Account UI)
 * ==========================================
 */

/**
 * GET /api/users/me - Get current logged-in user info
 */
export const getMyProfile = async () => {
  const res = await httpClient.get(`${API}/users/me`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * PUT /api/users/me - Update personal info
 */
export const updateMyProfile = async (profileData) => {
  const res = await httpClient.put(`${API}/users/me`, profileData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * PUT /api/users/change-password - Change personal password
 */
export const changeMyPassword = async (passwordData) => {
  const res = await httpClient.put(`${API}/users/change-password`, passwordData, {
    headers: getAuthHeader(),
  });
  return res.data;
};
