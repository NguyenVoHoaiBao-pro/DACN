import { useState, useEffect } from "react";
import {
    getProvinces,
    getDistricts,
    getWards,
    calculateShipping,
} from "../services/shippingService";

// ─── Cache tỉnh/thành ở module scope (tồn tại suốt session trình duyệt) ───────
// Tránh fetch lại 63 tỉnh mỗi lần mount Checkout
let provincesCache = null;

/**
 * useGHNShipping — Custom hook quản lý toàn bộ logic GHN shipping
 *
 * @param {number} cartTotal - Tổng tiền giỏ hàng (để tính phí & ngưỡng free ship)
 *
 * @returns {{
 *   provinces: Array,
 *   districts: Array,
 *   wards: Array,
 *   selectedProvince: {id: number, name: string} | null,
 *   selectedDistrict: {id: number, name: string} | null,
 *   selectedWard: {code: string, name: string} | null,
 *   shippingInfo: Object | null,
 *   loadingShipping: boolean,
 *   loadingDistricts: boolean,
 *   loadingWards: boolean,
 *   onProvinceChange: Function,
 *   onDistrictChange: Function,
 *   onWardChange: Function,
 *   resetShipping: Function,
 * }}
 */
export const useGHNShipping = (cartTotal = 0) => {
    // ─── Danh sách địa chỉ ───────────────────────────────────────────────────────
    const [provinces, setProvinces] = useState(provincesCache || []);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    // ─── Lựa chọn hiện tại — lưu cả id & name để gửi lên BE ─────────────────────
    const [selectedProvince, setSelectedProvince] = useState(null); // { id, name }
    const [selectedDistrict, setSelectedDistrict] = useState(null); // { id, name }
    const [selectedWard, setSelectedWard] = useState(null);         // { code, name } — code là String!

    // ─── Trạng thái shipping ──────────────────────────────────────────────────────
    const [shippingInfo, setShippingInfo] = useState(null);
    const [loadingShipping, setLoadingShipping] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    // ─── [1] Load tỉnh/thành 1 lần khi mount (có cache) ─────────────────────────
    useEffect(() => {
        if (provincesCache && provincesCache.length > 0) {
            setProvinces(provincesCache);
            return;
        }
        getProvinces()
            .then((data) => {
                provincesCache = data; // cache vào module scope
                setProvinces(data);
            })
            .catch((err) => console.error("[GHN] Load provinces failed:", err));
    }, []);

    // ─── [2] User chọn Tỉnh → load Quận ─────────────────────────────────────────
    const onProvinceChange = async (provinceId, provinceName) => {
        setSelectedProvince(provinceId ? { id: provinceId, name: provinceName } : null);
        setSelectedDistrict(null);
        setSelectedWard(null);
        setDistricts([]);
        setWards([]);
        setShippingInfo(null);

        if (!provinceId) return;

        setLoadingDistricts(true);
        try {
            const data = await getDistricts(provinceId);
            setDistricts(data);
        } catch (err) {
            console.error("[GHN] Load districts failed:", err);
        } finally {
            setLoadingDistricts(false);
        }
    };

    // ─── [3] User chọn Quận → load Phường ───────────────────────────────────────
    const onDistrictChange = async (districtId, districtName) => {
        setSelectedDistrict(districtId ? { id: districtId, name: districtName } : null);
        setSelectedWard(null);
        setWards([]);
        setShippingInfo(null);

        if (!districtId) return;

        setLoadingWards(true);
        try {
            const data = await getWards(districtId);
            setWards(data);
        } catch (err) {
            console.error("[GHN] Load wards failed:", err);
        } finally {
            setLoadingWards(false);
        }
    };

    // ─── [4] User chọn Phường → tính phí ship ───────────────────────────────────
    const onWardChange = async (wardCode, wardName) => {
        // wardCode PHẢI là String!
        const wardCodeStr = wardCode ? String(wardCode) : null;
        setSelectedWard(wardCodeStr ? { code: wardCodeStr, name: wardName } : null);
        setShippingInfo(null);

        if (!wardCodeStr || !selectedDistrict || !selectedProvince) return;

        setLoadingShipping(true);
        try {
            const info = await calculateShipping({
                toDistrictId: selectedDistrict.id,    // integer
                toWardCode: wardCodeStr,             // String!
                toProvinceId: selectedProvince.id,
                orderSubtotal: cartTotal,
            });
            setShippingInfo(info);
        } catch (err) {
            console.error("[GHN] Calculate shipping failed:", err);
            // Fallback UI — không báo lỗi user (backend đã có fallback, nhưng phòng hờ)
            setShippingInfo({
                shippingFee: 30000,
                shippingFeeFormatted: "30.000 đ",
                estimatedDeliveryDisplay: "Dự kiến giao trong 2-3 ngày",
                freeShipping: false,
                serviceId: 0,
                serviceName: "Vận chuyển tiêu chuẩn",
                error: false,
            });
        } finally {
            setLoadingShipping(false);
        }
    };

    // ─── Reset toàn bộ khi cần (vd: chuyển sang dùng addressId) ─────────────────
    const resetShipping = () => {
        setSelectedProvince(null);
        setSelectedDistrict(null);
        setSelectedWard(null);
        setDistricts([]);
        setWards([]);
        setShippingInfo(null);
    };

    return {
        // Data
        provinces,
        districts,
        wards,

        // Selections
        selectedProvince,
        selectedDistrict,
        selectedWard,

        // Shipping result
        shippingInfo,

        // Loading states
        loadingShipping,
        loadingDistricts,
        loadingWards,

        // Handlers
        onProvinceChange,
        onDistrictChange,
        onWardChange,
        resetShipping,
    };
};
