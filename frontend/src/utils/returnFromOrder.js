const RETURN_ELIGIBLE_STATUSES = new Set(["DELIVERED", "COMPLETED"]);

export const canRequestReturnForItem = (orderStatus, assignedImeis, paymentStatus) => {
  if (!RETURN_ELIGIBLE_STATUSES.has(orderStatus)) return false;
  if (!assignedImeis || assignedImeis.length === 0) return false;
  if (paymentStatus === "REFUNDED") return false;
  return paymentStatus === "PAID";
};

/** Hiển thị nút trả hàng ở header đơn (chưa cần IMEI). */
export const canShowReturnActionForOrder = (order) => {
  if (!order) return false;
  if (!RETURN_ELIGIBLE_STATUSES.has(order.status)) return false;
  if (order.paymentStatus === "REFUNDED") return false;
  return order.paymentStatus === "PAID";
};

/** Gom các dòng có thể trả hàng sau khi đã load chi tiết đơn. */
export const collectReturnableItems = (orderDetail, returnBySerial = {}) => {
  if (!orderDetail?.items) return [];
  const rows = [];
  orderDetail.items.forEach((item) => {
    if (!canRequestReturnForItem(orderDetail.status, item.assignedImeis, orderDetail.paymentStatus)) {
      return;
    }
    (item.assignedImeis || []).forEach((imei) => {
      rows.push({
        item,
        imei,
        existing: returnBySerial[imei] || null,
        label: `${item.productName}${item.variantName ? ` (${item.variantName})` : ""} — ${imei}`,
      });
    });
  });
  return rows;
};

export const buildReturnRequestContext = (orderDetail, item, imei) => ({
  orderCode: orderDetail.orderCode,
  orderId: orderDetail.id,
  orderStatus: orderDetail.status,
  paymentStatus: orderDetail.paymentStatus,
  productName: item.productName,
  variantName: item.variantName,
  skuCode: item.skuCode,
  serialNumber: imei,
  shippingName: orderDetail.shippingName,
  shippingPhone: orderDetail.shippingPhone,
});
