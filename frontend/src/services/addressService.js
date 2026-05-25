import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const ADDRESS_API = `${API_PREFIX}/addresses`;

// Helper lấy header Authorization chứa Bearer token
const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * GET /api/addresses - Lấy tất cả địa chỉ của user
 * Backend tự động đẩy địa chỉ mặc định (isDefault: true) lên vị trí đầu tiên.
 */
export const getAddresses = async () => {
    const res = await httpClient.get(ADDRESS_API, {
        headers: getAuthHeader(),
    });
    return res.data;
};

/**
 * POST /api/addresses - Thêm mới một địa chỉ
 * @param {Object} addressData 
 * { receiverName, phone, province, district, ward, addressDetail, isDefault, label }
 */
export const createAddress = async (addressData) => {
    const res = await httpClient.post(ADDRESS_API, addressData, {
        headers: getAuthHeader(),
    });
    return res.data;
};

/**
 * PUT /api/addresses/{id} - Cập nhật địa chỉ
 * @param {number} id 
 * @param {Object} addressData 
 */
export const updateAddress = async (id, addressData) => {
    const res = await httpClient.put(`${ADDRESS_API}/${id}`, addressData, {
        headers: getAuthHeader(),
    });
    return res.data;
};

/**
 * PUT /api/addresses/{id}/default - Đặt địa chỉ làm mặc định nhanh
 * @param {number} id 
 */
export const setDefaultAddress = async (id) => {
    const res = await httpClient.put(`${ADDRESS_API}/${id}/default`, {}, {
        headers: getAuthHeader(),
    });
    return res.data;
};

/**
 * DELETE /api/addresses/{id} - Xóa địa chỉ
 * @param {number} id 
 */
export const deleteAddress = async (id) => {
    const res = await httpClient.delete(`${ADDRESS_API}/${id}`, {
        headers: getAuthHeader(),
    });
    return res.data;
};
