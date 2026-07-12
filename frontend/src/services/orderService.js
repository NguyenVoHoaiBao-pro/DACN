import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = `${API_PREFIX}/orders`;
const ADMIN_API = `${API_PREFIX}/admin/orders`;
const ADDRESS_API = `${API_PREFIX}/addresses`;

// ═══════════════════════════════════════════════════════════════════════════════
// USER — Order Service
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/orders — Checkout (đặt hàng từ giỏ) [Phase 7]
 * Backend endpoint: @PostMapping trên /api/orders (không có sub-path /checkout)
 * @param {Object} request - CheckoutRequest
 *   Luồng A (địa chỉ đã lưu): { addressId, toDistrictId, toWardCode, paymentMethod, couponCode?, note? }
 *   Luồng B (nhập mới):       { shippingName, shippingPhone, shippingAddress, shippingProvince?, shippingDistrict?, shippingWard?, toDistrictId, toWardCode, paymentMethod, couponCode?, note? }
 *   toDistrictId: integer — GHN district id
 *   toWardCode:   String  — GHN ward code (ví dụ: "90737")
 * @returns {Object} OrderResponse { id, orderCode, paymentUrl, shippingFee, ... }
 */
export const checkout = async (request) => {
  const res = await httpClient.post(API, request);
  return res.data?.data;
};

/**
 * GET /api/orders — Danh sách đơn hàng của tôi
 * @param {number} page
 * @param {number} size
 * @param {string|null} status - PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, COMPLETED, CANCELLED, REFUNDED
 * @returns {Object} Page<OrderSummaryResponse>
 */
export const getMyOrders = async (page = 0, size = 10, status = null) => {
  const params = { page, size };
  if (status) params.status = status;
  const res = await httpClient.get(API, { params });
  return res.data?.data;
};

/**
 * GET /api/orders/{orderCode} — Chi tiết đơn hàng
 * @param {string} orderCode
 * @returns {Object} OrderResponse
 */
export const getOrderDetail = async (orderCode) => {
  const res = await httpClient.get(`${API}/${orderCode}`);
  return res.data?.data;
};

/**
 * PUT /api/orders/{id}/cancel — Hủy đơn hàng
 * @param {number} id
 * @param {string|null} reason
 * @returns {Object} OrderResponse
 */
export const cancelOrder = async (id, reason = null) => {
  const body = reason ? { reason } : {};
  const res = await httpClient.put(`${API}/${id}/cancel`, body);
  return res.data?.data;
};

/**
 * GET /api/orders/preview-coupon?code=XXX — Xem trước giảm giá
 * @param {string} code
 * @returns {Object} ApplyCouponResponse
 */
export const previewCoupon = async (code) => {
  const res = await httpClient.get(`${API}/preview-coupon`, { params: { code } });
  return res.data?.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS — Lấy danh sách địa chỉ đã lưu
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/addresses — Lấy tất cả địa chỉ của user
 * @returns {Array} AddressDto.Response[]
 */
export const getMyAddresses = async () => {
  const res = await httpClient.get(ADDRESS_API);
  return res.data?.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Order Management Service
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/orders — Danh sách tất cả đơn hàng
 */
export const fetchWarehouseFulfillmentQueue = async (page = 0, size = 20) => {
  const res = await httpClient.get(`${ADMIN_API}/warehouse/fulfillment-queue`, {
    params: { page, size },
  });
  return res.data?.data;
};

/** Bắt đầu gom hàng: CONFIRMED → PROCESSING */
export const startWarehousePicking = async (orderId) => {
  return adminUpdateOrderStatus(orderId, { status: "PROCESSING" });
};

export const adminGetOrders = async (
  page = 0,
  size = 10,
  status = null,
  keyword = null,
  sortBy = "orderDate",
  sortDir = "desc",
  userId = null,
) => {
  const params = { page, size, sortBy, sortDir };
  if (status) params.status = status;
  if (keyword) params.keyword = keyword;
  if (userId != null) params.userId = userId;
  const res = await httpClient.get(ADMIN_API, { params });
  return res.data?.data;
};

/**
 * GET /api/admin/orders/stats — Thống kê đơn hàng
 */
export const adminGetOrderStats = async () => {
  const res = await httpClient.get(`${ADMIN_API}/stats`);
  return res.data?.data;
};

/**
 * GET /api/admin/orders/{id} — Chi tiết đơn hàng (admin)
 */
export const adminGetOrderDetail = async (id) => {
  const res = await httpClient.get(`${ADMIN_API}/${id}`);
  return res.data?.data;
};

/**
 * PUT /api/admin/orders/{id}/delivery-info — Sửa thông tin giao hàng & ghi chú (Sales: PENDING/CONFIRMED)
 */
export const adminUpdateOrderDelivery = async (id, request) => {
  const res = await httpClient.put(`${ADMIN_API}/${id}/delivery-info`, request);
  return res.data?.data;
};

/**
 * PUT /api/admin/orders/{id}/status — Cập nhật trạng thái đơn
 * @param {number} id
 * @param {Object} request - { status, adminNote?, trackingCode?, cancelReason? }
 */
export const adminUpdateOrderStatus = async (id, request) => {
  const res = await httpClient.put(`${ADMIN_API}/${id}/status`, request);
  return res.data?.data;
};

/**
 * POST /api/admin/orders/{id}/assign-imei — Gán IMEI cho đơn hàng
 * @param {number} id
 * @param {Object} request - { orderDetailId, imeis: string[] }
 */
export const adminAssignImei = async (id, request) => {
  const res = await httpClient.put(`${ADMIN_API}/${id}/assign-imei`, request);
  return res.data?.data;
};

/**
 * PUT /api/admin/orders/{id}/payment-status — Cập nhật trạng thái thanh toán
 * @param {number} id
 * @param {Object} request - { paymentStatus }
 */
export const adminUpdatePaymentStatus = async (id, request) => {
  const res = await httpClient.put(`${ADMIN_API}/${id}/payment-status`, request);
  return res.data?.data;
};

/**
 * PUT /api/admin/orders/{id}/cancel — Admin hủy đơn hàng
 */
export const adminCancelOrder = async (id, reason = null) => {
  const body = reason ? { reason } : {};
  const res = await httpClient.put(`${ADMIN_API}/${id}/cancel`, body);
  return res.data?.data;
};

/**
 * PATCH /api/admin/orders/{id}/visibility — Ẩn/Hiện đơn hàng (Soft Delete)
 */
export const adminUpdateVisibility = async (id, hidden, reason = null) => {
  const body = { hidden };
  if (reason) body.reason = reason;
  const res = await httpClient.put(`${ADMIN_API}/${id}/visibility`, body);
  return res.data?.data;
};

/**
 * GET /api/admin/orders/hidden — Xem giỏ Thùng rác
 */
export const adminGetHiddenOrders = async (page = 0, size = 10) => {
  const res = await httpClient.get(`${ADMIN_API}/hidden`, { params: { page, size } });
  return res.data?.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT — Cổng Thanh Toán VNPay
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payment/status/{orderCode} — Kiểm tra trạng thái thanh toán
 */
export const getPaymentStatus = async (orderCode) => {
  const res = await httpClient.get(`${API_PREFIX}/payment/status/${orderCode}`);
  return res.data?.data;
};

/**
 * POST /api/payment/create — Tạo lại link thanh toán (Retry Payment)
 * @param {Object} data - { orderCode, bankCode, language }
 */
export const createRetryPayment = async (data) => {
  const res = await httpClient.post(`${API_PREFIX}/payment/create`, data);
  return res.data?.data;
};

/**
 * GET /api/payment/history/{orderCode} — Lịch sử giao dịch
 */
export const getPaymentHistory = async (orderCode) => {
  const res = await httpClient.get(`${API_PREFIX}/payment/history/${orderCode}`);
  return res.data?.data;
};
