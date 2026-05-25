import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const SHIPPING_API = `${API_PREFIX}/shipping`;

// ═══════════════════════════════════════════════════════════════════════════════
// GHN Shipping Service — Tất cả gọi qua backend proxy, không gọi GHN trực tiếp
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/shipping/provinces — Lấy 63 tỉnh/thành Việt Nam
 * @returns {Array} [{ provinceId, provinceName, code }]
 */
export const getProvinces = async () => {
    const res = await httpClient.get(`${SHIPPING_API}/provinces`);
    return res.data?.data || [];
};

/**
 * GET /api/shipping/districts?provinceId={id} — Lấy quận/huyện theo tỉnh
 * @param {number} provinceId
 * @returns {Array} [{ districtId, districtName, provinceId, districtEncode }]
 */
export const getDistricts = async (provinceId) => {
    const res = await httpClient.get(`${SHIPPING_API}/districts`, {
        params: { provinceId },
    });
    return res.data?.data || [];
};

/**
 * GET /api/shipping/wards?districtId={id} — Lấy phường/xã theo quận
 * @param {number} districtId
 * @returns {Array} [{ wardCode, wardName, districtId }]
 * NOTE: wardCode là String! Ví dụ: "90737", "1A0807"
 */
export const getWards = async (districtId) => {
    const res = await httpClient.get(`${SHIPPING_API}/wards`, {
        params: { districtId },
    });
    return res.data?.data || [];
};

/**
 * POST /api/shipping/checkout — Tính phí ship + ngày giao cùng lúc ⭐
 * Gọi khi user chọn xong phường/xã.
 * @param {Object} params
 * @param {number} params.toDistrictId - integer
 * @param {string} params.toWardCode   - String! Ví dụ: "90737"
 * @param {number} params.toProvinceId
 * @param {number} params.orderSubtotal
 * @returns {Object} { shippingFee, shippingFeeFormatted, freeShipping, freeShippingReason, estimatedDeliveryDate, estimatedDeliveryDisplay, serviceId, serviceName, error, errorMessage }
 */
export const calculateShipping = async ({
    toDistrictId,
    toWardCode,
    toProvinceId,
    orderSubtotal,
}) => {
    const res = await httpClient.post(`${SHIPPING_API}/checkout`, {
        toDistrictId,           // integer
        toWardCode: String(toWardCode), // luôn String!
        toProvinceId,
        orderSubtotal,
    });
    return res.data?.data;
};

/**
 * GET /api/shipping/ghn/tracking/{trackingCode} — Lấy lịch sử giao hàng
 * @param {string} trackingCode
 * @returns {Object} Lịch sử vận đơn từ GHN
 */
export const getTrackingInfo = async (trackingCode) => {
    const res = await httpClient.get(`${SHIPPING_API}/ghn/tracking/${trackingCode}`);
    return res.data;
};
