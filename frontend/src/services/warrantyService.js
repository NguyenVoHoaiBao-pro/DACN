import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC — Tra cứu bảo hành (Không cần JWT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/public/warranty/check/{code}
 * Tra cứu bảo hành bằng IMEI hoặc Serial Number
 * @param {string} code - Mã IMEI hoặc Serial Number
 * @returns {Object} WarrantyCheckResponse
 */
export const checkWarranty = async (code) => {
    const res = await httpClient.get(`${API_PREFIX}/public/warranty/check/${code}`);
    return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Quản lý phiếu bảo hành (RMA Ticket) (Cần JWT — WARRANTY_MANAGE hoặc ADMIN)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lấy danh sách phiếu bảo hành (Hỗ trợ phân trang + tìm kiếm)
 * @param {Object} params - { page, size, status, keyword }
 */
export const getWarrantyTickets = async (params) => {
    const token = localStorage.getItem("token");
    const res = await httpClient.get(`${API_PREFIX}/admin/warranty/tickets`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
};

/**
 * Lấy chi tiết 1 phiếu bảo hành
 * @param {number} id - ID của phiếu
 */
export const getWarrantyTicketDetails = async (id) => {
    const token = localStorage.getItem("token");
    const res = await httpClient.get(`${API_PREFIX}/admin/warranty/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
};

/**
 * Tạo phiếu tiếp nhận bảo hành mới
 * @param {Object} data - { imeiOrSerial, customerName, customerPhone, issueDescription }
 */
export const createWarrantyTicket = async (data) => {
    const token = localStorage.getItem("token");
    const res = await httpClient.post(
        `${API_PREFIX}/admin/warranty/tickets`,
        data,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );
    return res.data;
};

/**
 * Cập nhật trạng thái sửa chữa của phiếu bảo hành
 * @param {number} id - ID của phiếu
 * @param {Object} data - { status, technicianNote, repairCost }
 */
export const updateWarrantyTicketStatus = async (id, data) => {
    const token = localStorage.getItem("token");
    const res = await httpClient.put(
        `${API_PREFIX}/admin/warranty/tickets/${id}/status`,
        data,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );
    return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Nhập IMEI vào kho (Cần JWT — WAREHOUSE hoặc ADMIN)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/inventory/imei
 * Nhập danh sách IMEI/Serial cho một biến thể sản phẩm
 * @param {number} variantId - ID của biến thể sản phẩm
 * @param {Array} items - Danh sách { imei, serialNumber }
 * @returns {Object} Response
 */
export const importImei = async (variantId, items) => {
    const token = localStorage.getItem("token");
    const res = await httpClient.post(
        `${API_PREFIX}/admin/inventory/imei`,
        { variantId, items },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );
    return res.data;
};
