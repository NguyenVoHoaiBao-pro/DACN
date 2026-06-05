/** Đơn đủ điều kiện gửi BH từ lịch sử mua (đã giao / hoàn tất) */
export const ORDER_STATUSES_WARRANTY_CLAIM = ["SHIPPING", "DELIVERED", "COMPLETED"];

export const canRequestWarrantyForOrder = (orderStatus) =>
  ORDER_STATUSES_WARRANTY_CLAIM.includes(orderStatus);

export const canRequestWarrantyForItem = (orderStatus, assignedImeis) =>
  canRequestWarrantyForOrder(orderStatus) &&
  Array.isArray(assignedImeis) &&
  assignedImeis.length > 0;
