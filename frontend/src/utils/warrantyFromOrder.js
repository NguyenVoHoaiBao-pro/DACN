import { getDistricts, getWards } from "../services/shippingService";

/** Đơn đủ điều kiện gửi BH từ lịch sử mua (đã giao / hoàn tất) */
export const ORDER_STATUSES_WARRANTY_CLAIM = ["SHIPPING", "DELIVERED", "COMPLETED"];

export const canRequestWarrantyForOrder = (orderStatus) =>
  ORDER_STATUSES_WARRANTY_CLAIM.includes(orderStatus);

export const canRequestWarrantyForItem = (orderStatus, assignedImeis) =>
  canRequestWarrantyForOrder(orderStatus) &&
  Array.isArray(assignedImeis) &&
  assignedImeis.length > 0;

/** Ghép context gửi BH từ dòng đơn + chi tiết đơn */
export const buildWarrantyClaimContext = (orderDetail, item) => ({
  orderId: orderDetail.id,
  orderDetailId: item.id,
  orderCode: orderDetail.orderCode,
  productName: item.productName,
  variantName: item.variantName,
  imei: item.assignedImeis?.[0] || "",
  shippingName: orderDetail.shippingName || "",
  shippingPhone: orderDetail.shippingPhone || "",
  shippingAddress: orderDetail.shippingAddress || "",
  shippingProvince: orderDetail.shippingProvince || "",
  shippingDistrict: orderDetail.shippingDistrict || "",
  shippingWard: orderDetail.shippingWard || "",
  toDistrictId: orderDetail.toDistrictId ?? null,
  toWardCode: orderDetail.toWardCode ? String(orderDetail.toWardCode) : "",
});

const normalizeName = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

const matchByName = (name, list, key) => {
  const n = normalizeName(name);
  if (!n || !list?.length) return null;
  let found = list.find((item) => normalizeName(item[key]) === n);
  if (!found) {
    found = list.find((item) => {
      const candidate = normalizeName(item[key]);
      return candidate.includes(n) || n.includes(candidate);
    });
  }
  return found || null;
};

/** Khớp tỉnh/quận/phường GHN từ địa chỉ giao hàng trong đơn */
export const resolveGhnFromOrderContext = async (context, provinces) => {
  const empty = { province: null, district: null, ward: null };
  if (!provinces?.length) return empty;

  const prov = matchByName(context.shippingProvince, provinces, "provinceName");
  if (!prov) return empty;

  const result = {
    province: { id: prov.provinceId, name: prov.provinceName },
    district: null,
    ward: null,
  };

  const districts = await getDistricts(prov.provinceId);
  let dist = context.toDistrictId
    ? districts.find((d) => d.districtId === context.toDistrictId)
    : null;
  if (!dist) {
    dist = matchByName(context.shippingDistrict, districts, "districtName");
  }
  if (!dist) return result;

  result.district = { id: dist.districtId, name: dist.districtName };

  const wards = await getWards(dist.districtId);
  let ward = context.toWardCode
    ? wards.find((w) => String(w.wardCode) === String(context.toWardCode))
    : null;
  if (!ward) {
    ward = matchByName(context.shippingWard, wards, "wardName");
  }
  if (ward) {
    result.ward = { code: String(ward.wardCode), name: ward.wardName };
  }
  return result;
};
