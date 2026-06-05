/** Luồng chuyển trạng thái đầy đủ (Admin) */
export const ORDER_STATUS_FLOW = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED", "CANCELLED"],
  CANCELLED: ["REFUNDED"],
  COMPLETED: [],
  REFUNDED: [],
};

/**
 * Admin hệ thống: role ADMIN hoặc quyền quản trị (USER_MANAGE / REPORT_REVENUE).
 * Sales whitelist không có các quyền này.
 */
export const isFullOrderAdmin = (hasAnyPermission, { isAdminUser } = {}) =>
  isAdminUser === true ||
  (typeof hasAnyPermission === "function" &&
    hasAnyPermission(["USER_MANAGE", "REPORT_REVENUE", "ROLE_PERM_EDIT"]));

export const canWarehouseFulfillOrders = (hasAnyPermission) =>
  hasAnyPermission(["ORDER_ASSIGN_SHIPPING", "ORDER_TRACKING_UPDATE", "IMEI_MANAGE"]);

export const canSalesOrderOps = (hasAnyPermission) =>
  hasAnyPermission(["ORDER_CONFIRM", "ORDER_CANCEL"]);

export const canAssignOrderImei = (_hasAnyPermission, ctx = {}) =>
  ctx.isAdminUser === true || ctx.isWarehouseUser === true;

export const canEditOrderPayment = (_hasAnyPermission, ctx = {}) =>
  ctx.isAdminUser === true || ctx.isWarehouseUser === true;

export const canToggleOrderVisibility = (_hasAnyPermission, ctx = {}) =>
  ctx.isAdminUser === true;

/**
 * Trạng thái đích được phép chọn theo role (khớp backend OrderSecurityHelper).
 */
export const getAllowedNextStatuses = (currentStatus, caps) => {
  const {
    isFullAdmin,
    canWarehouseFulfill,
    canSalesOps,
    canCancel,
  } = caps;

  if (isFullAdmin) {
    return ORDER_STATUS_FLOW[currentStatus] || [];
  }

  const allowed = new Set();

  if (canSalesOps) {
    if (currentStatus === "PENDING") {
      allowed.add("CONFIRMED");
      if (canCancel) allowed.add("CANCELLED");
    }
    if (currentStatus === "CONFIRMED" && canCancel) {
      allowed.add("CANCELLED");
    }
  }

  if (canWarehouseFulfill) {
    const warehouseFlow = {
      CONFIRMED: ["PROCESSING"],
      PROCESSING: ["SHIPPING"],
      SHIPPING: ["DELIVERED"],
      DELIVERED: ["COMPLETED"],
    };
    (warehouseFlow[currentStatus] || []).forEach((s) => allowed.add(s));
    if (canCancel && ["PROCESSING", "SHIPPING"].includes(currentStatus)) {
      allowed.add("CANCELLED");
    }
  }

  return [...allowed];
};

export const resolveOrderCaps = (ctx) => {
  const { hasAnyPermission, hasPermission, isAdminUser, isSalesUser, isWarehouseUser } = ctx;
  const isFullAdmin = isFullOrderAdmin(hasAnyPermission, { isAdminUser });
  const canWarehouseFulfill =
    !isFullAdmin && (isWarehouseUser || canWarehouseFulfillOrders(hasAnyPermission));
  const canSalesOps = !isFullAdmin && (isSalesUser || canSalesOrderOps(hasAnyPermission));
  const canCancel = isFullAdmin || hasPermission("ORDER_CANCEL");
  /** Admin/Kho: bấm chip trạng thái. Sales: chỉ xem chip + nút Xác nhận/Hủy riêng. */
  const canClickStatusChip = isFullAdmin || canWarehouseFulfill;
  const salesQuickActions = canSalesOps && !canClickStatusChip;

  return {
    isFullAdmin,
    canWarehouseFulfill,
    canSalesOps,
    canCancel,
    canUpdateStatus: isFullAdmin || canWarehouseFulfill || canSalesOps,
    canClickStatusChip,
    salesQuickActions,
    canUpdatePayment: canEditOrderPayment(hasAnyPermission, ctx),
    canHideOrders: canToggleOrderVisibility(hasAnyPermission, ctx),
    canAssignImei: canAssignOrderImei(hasAnyPermission, ctx),
  };
};
