const SEEN_PO_KEY = "warehouse_seen_po_ids";

export const WAREHOUSE_ALERT_STATUSES = new Set(["IN_TRANSIT", "APPROVED"]);

export function getSeenPoIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_PO_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function markPoIdsSeen(ids) {
  const seen = getSeenPoIds();
  ids.forEach((id) => seen.add(id));
  localStorage.setItem(SEEN_PO_KEY, JSON.stringify([...seen]));
}

/** PO trong hàng đợi kho mà nhân viên chưa xem */
export function getUnseenWarehousePos(poList = []) {
  const seen = getSeenPoIds();
  return poList.filter(
    (po) => WAREHOUSE_ALERT_STATUSES.has(po.status) && !seen.has(po.id),
  );
}

export function formatPoAlertMessage(po) {
  const qty = po.totalQuantityOrdered ?? 0;
  return `Sắp có lô hàng (${qty} SP) từ ${po.supplierName || "NCC"} — PO ${po.poNumber}`;
}
