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
// WARRANTY CLAIMS — Yêu cầu BH online (Sales workflow)
// ═══════════════════════════════════════════════════════════════════════════════

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getWarrantyClaims = async (params = {}) => {
  const res = await httpClient.get(`${API_PREFIX}/admin/warranty/claims`, {
    params,
    headers: authHeader(),
  });
  return res.data;
};

export const getWarrantyClaimDetail = async (id) => {
  const res = await httpClient.get(`${API_PREFIX}/admin/warranty/claims/${id}`, {
    headers: authHeader(),
  });
  return res.data;
};

export const getWarrantyReturnTracking = async (id) => {
  const res = await httpClient.get(`${API_PREFIX}/admin/warranty/claims/${id}/return-tracking`, {
    headers: authHeader(),
  });
  return res.data;
};

export const getMyWarrantyClaimDetail = async (id) => {
  const res = await httpClient.get(`${API_PREFIX}/warranty/claims/mine/${id}`, {
    headers: authHeader(),
  });
  return res.data;
};

export const approveWarrantyClaim = async (id, payload = {}) => {
  const body =
    typeof payload === "string"
      ? { staffNotes: payload }
      : {
          staffNotes: payload.staffNotes ?? "",
          returnCarrier: payload.returnCarrier,
          returnTrackingCode: payload.returnTrackingCode,
        };
  const res = await httpClient.put(
    `${API_PREFIX}/admin/warranty/claims/${id}/approve`,
    body,
    { headers: authHeader() }
  );
  return res.data;
};

export const rejectWarrantyClaim = async (id, reason) => {
  const res = await httpClient.put(
    `${API_PREFIX}/admin/warranty/claims/${id}/reject`,
    { reason },
    { headers: authHeader() }
  );
  return res.data;
};

/** Tra cứu ticket APPROVED chờ nhận tại kho (mã vận đơn hoặc #BH-...) */
export const lookupWarrantyInbound = async (keyword) => {
  const res = await httpClient.get(`${API_PREFIX}/admin/warranty/claims/inbound/lookup`, {
    params: { keyword: keyword.trim() },
    headers: authHeader(),
  });
  return res.data;
};

export const markWarrantyClaimReceived = async (id, inboundPayload = null) => {
  const body = inboundPayload
    ? {
        receivedImei: inboundPayload.receivedImei,
        boxCondition: inboundPayload.boxCondition,
        warehouseNotes: inboundPayload.warehouseNotes ?? "",
      }
    : null;
  const res = await httpClient.put(`${API_PREFIX}/admin/warranty/claims/${id}/received`, body, {
    headers: authHeader(),
  });
  return res.data;
};

export const submitWarrantyInspection = async (id, inspectionResult) => {
  const res = await httpClient.put(
    `${API_PREFIX}/admin/warranty/claims/${id}/inspection`,
    { inspectionResult },
    { headers: authHeader() }
  );
  return res.data;
};

export const resolveWarrantyClaim = async (id, resolution, staffNotes = "") => {
  const res = await httpClient.put(
    `${API_PREFIX}/admin/warranty/claims/${id}/resolve`,
    { resolution, staffNotes },
    { headers: authHeader() }
  );
  return res.data;
};

export const closeWarrantyClaim = async (id) => {
  const res = await httpClient.put(`${API_PREFIX}/admin/warranty/claims/${id}/close`, null, {
    headers: authHeader(),
  });
  return res.data;
};

export const submitWarrantyClaim = async (payload) => {
  const res = await httpClient.post(`${API_PREFIX}/warranty/claims`, payload, {
    headers: authHeader(),
  });
  return res.data;
};

/** GET /api/warranty/claims/mine — Yêu cầu BH của khách đang đăng nhập */
export const getMyWarrantyClaims = async (params = {}) => {
  const res = await httpClient.get(`${API_PREFIX}/warranty/claims/mine`, {
    params,
    headers: authHeader(),
  });
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
