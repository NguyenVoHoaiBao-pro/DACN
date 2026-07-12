/** Xây danh sách đơn vị cần quét serial từ chi tiết đơn hàng */
export function buildPickTasks(order) {
  if (!order?.items?.length) return [];
  const tasks = [];
  order.items.forEach((item) => {
    const assigned = item.assignedImeis?.length || 0;
    const remaining = Math.max(0, (item.quantity || 0) - assigned);
    for (let i = 0; i < remaining; i += 1) {
      tasks.push({
        orderDetailId: item.id,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        skuCode: item.skuCode,
        imageUrl: item.imageUrl,
        unitIndex: assigned + i + 1,
        lineQuantity: item.quantity,
      });
    }
  });
  return tasks;
}

export function isOrderFullyPicked(order) {
  return buildPickTasks(order).length === 0;
}

export function formatShelfLocation(location) {
  if (location && String(location).trim()) return location;
  return "Kệ A — Tầng 2 — Ô 5 (mặc định demo)";
}

export const PICKING_STATUS = {
  CONFIRMED: { label: "Chờ gom hàng", color: "warning", bg: "#fff3e0", border: "#ffb74d" },
  PROCESSING: { label: "Đang gom hàng", color: "info", bg: "#e3f2fd", border: "#64b5f6" },
};
