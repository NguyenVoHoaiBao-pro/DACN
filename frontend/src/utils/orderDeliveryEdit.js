export const ORDER_STATUS_LABELS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang đóng gói",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

/** Sales chỉ sửa giao hàng khi đơn chưa vào kho đóng gói / vận chuyển */
export const SALES_EDITABLE_ORDER_STATUSES = ["PENDING", "CONFIRMED"];

export const canSalesEditDelivery = (status) =>
  SALES_EDITABLE_ORDER_STATUSES.includes(status);

export const salesDeliveryLockReason = (status) => {
  switch (status) {
    case "PROCESSING":
      return "Đơn đang đóng gói — nhãn vận chuyển có thể đã in. Không thể sửa địa chỉ.";
    case "SHIPPING":
      return "Đơn đã giao cho đơn vị vận chuyển / đang giao hàng — không thể sửa.";
    case "DELIVERED":
    case "COMPLETED":
      return "Đơn đã giao hoặc hoàn tất — không thể sửa.";
    case "CANCELLED":
    case "REFUNDED":
      return "Đơn đã hủy hoặc hoàn tiền — không thể sửa.";
    default:
      return "Chỉ sửa được khi đơn ở trạng thái Chờ xử lý hoặc Đã xác nhận.";
  }
};
