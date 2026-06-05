export const CLAIM_STATUS_LABELS = {
  PENDING: "Chờ xử lý",
  RECEIVED: "Đã nhận máy",
  INSPECTING: "Đang kiểm tra",
  APPROVED: "Đã duyệt thu hồi",
  REJECTED: "Từ chối",
  REPAIRING: "Đang sửa chữa",
  COMPLETED: "Hoàn tất",
  RETURNED: "Đã trả khách",
};

export const CLAIM_STATUS_COLORS = {
  PENDING: "#f59e0b",
  RECEIVED: "#3b82f6",
  INSPECTING: "#8b5cf6",
  APPROVED: "#06b6d4",
  REJECTED: "#ef4444",
  REPAIRING: "#6366f1",
  COMPLETED: "#16a34a",
  RETURNED: "#64748b",
};

export const RESOLUTION_OPTIONS = [
  { value: "REPLACE", label: "Đổi sản phẩm mới (tạo đơn 0đ → Kho)" },
  { value: "REPAIR_RETURN", label: "Sửa chữa và gửi trả khách" },
  { value: "REJECT", label: "Từ chối bảo hành (lỗi người dùng)" },
];
