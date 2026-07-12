import {
  CheckCircle as CheckIcon,
  Cancel as CancelOrderIcon,
  DeleteOutline as TrashIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Restore as RestoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  adminGetOrders,
  adminGetHiddenOrders,
  adminGetOrderDetail,
  adminUpdateOrderStatus,
  adminUpdatePaymentStatus,
  adminUpdateVisibility,
} from "../../services/orderService";
import { formatMoney } from "../../utils/formatters";
import AdminOrderDetailDialog from "./AdminOrderDetailDialog";
import GhnStatusBadge from "../../components/Shipping/GhnStatusBadge";
import SalesDeliveryEditDialog from "./SalesDeliveryEditDialog";
import { usePermissions } from "../../hooks/usePermissions";
import { canSalesEditDelivery } from "../../utils/orderDeliveryEdit";
import {
  getAllowedNextStatuses,
  resolveOrderCaps,
} from "../../utils/orderRolePermissions";

// ─── Status Configs ───
const ORDER_STATUS_TABS = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chờ xác nhận", value: "PENDING" },
  { label: "Đã xác nhận", value: "CONFIRMED" },
  { label: "Đang đóng gói", value: "PROCESSING" },
  { label: "Đang giao", value: "SHIPPING" },
  { label: "Đã giao", value: "DELIVERED" },
  { label: "Hoàn thành", value: "COMPLETED" },
  { label: "Đã hủy", value: "CANCELLED" },
  { label: "Hoàn tiền", value: "REFUNDED" },
];

const getOrderStatusConfig = (status) => {
  switch (status) {
    case "PENDING":
      return { label: "Chờ xác nhận", color: "warning" };
    case "CONFIRMED":
      return { label: "Đã xác nhận", color: "info" };
    case "PROCESSING":
      return { label: "Đang đóng gói", color: "secondary" };
    case "SHIPPING":
      return { label: "Đang giao", color: "primary" };
    case "DELIVERED":
      return { label: "Đã giao", color: "success" };
    case "COMPLETED":
      return { label: "Hoàn thành", sx: { bgcolor: "#1b5e20", color: "#fff" } };
    case "CANCELLED":
      return { label: "Đã hủy", color: "error" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", color: "default" };
    default:
      return { label: status || "N/A", color: "default" };
  }
};

const getPaymentStatusConfig = (status) => {
  switch (status) {
    case "PAID":
      return { label: "Đã thanh toán", color: "success" };
    case "PENDING":
      return { label: "Chưa thanh toán", color: "warning" };
    case "FAILED":
      return { label: "Giao dịch lỗi", color: "error" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", color: "default" };
    default:
      return { label: status || "N/A", color: "default" };
  }
};

const OrderManagementPage = () => {
  const permissions = usePermissions();
  const { hasAnyPermission, isAdminUser, isSalesUser, isWarehouseUser } = permissions;
  const caps = resolveOrderCaps(permissions);
  const {
    isFullAdmin,
    canUpdatePayment,
    canHideOrders,
    canClickStatusChip,
    salesQuickActions,
  } = caps;
  const canEditDelivery = hasAnyPermission(["ORDER_EDIT_DELIVERY", "ORDER_CONFIRM"]);
  const orderStatusCaps = {
    isFullAdmin: caps.isFullAdmin,
    canWarehouseFulfill: caps.canWarehouseFulfill,
    canSalesOps: caps.canSalesOps,
    canCancel: caps.canCancel,
  };

  // ─── States ───
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // Filters & Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusTab, setStatusTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(""); // debounce search

  // View Mode
  const [isTrashView, setIsTrashView] = useState(false);

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [deliveryEditOpen, setDeliveryEditOpen] = useState(false);
  const [deliveryEditOrder, setDeliveryEditOrder] = useState(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    id: null,
    orderCode: "",
    status: "",
    adminNote: "",
    trackingCode: "",
    cancelReason: "",
    currentStatus: "",
  });

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    id: null,
    paymentStatus: "",
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // ─── Fetch Data ───
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusTab === "ALL" ? null : statusTab;
      const keyParam = searchQuery.trim() || null;

      let data;
      if (isTrashView) {
        data = await adminGetHiddenOrders(page, rowsPerPage);
      } else {
        data = await adminGetOrders(page, rowsPerPage, statusParam, keyParam);
      }

      setOrders(data?.content || []);
      setTotalElements(data?.totalElements || 0);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng", error);
      showSnackbar("Lỗi khi tải danh sách đơn hàng", "error");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusTab, searchQuery, isTrashView]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0); // reset page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // ─── Handlers ───
  const handleTabChange = (event, newValue) => {
    setStatusTab(newValue);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const showSnackbar = (msg, sev = "success") => {
    setSnackbar({ open: true, message: msg, severity: sev });
  };

  const openStatusDialog = (order, nextStatus) => {
    setStatusForm({
      id: order.id,
      orderCode: order.orderCode,
      currentStatus: order.status,
      status: nextStatus,
      trackingCode: order.trackingCode || "",
      adminNote: order.adminNote || "",
      cancelReason: "",
    });
    setStatusDialogOpen(true);
  };

  const handleSalesConfirm = (order) => {
    if (order.status !== "PENDING") return;
    openStatusDialog(order, "CONFIRMED");
  };

  const handleSalesCancel = (order) => {
    if (!["PENDING", "CONFIRMED"].includes(order.status)) return;
    openStatusDialog(order, "CANCELLED");
  };

  const handleUpdateStatusSubmit = async () => {
    try {
      const updated = await adminUpdateOrderStatus(statusForm.id, {
        status: statusForm.status,
        adminNote: statusForm.adminNote,
        trackingCode: statusForm.trackingCode,
        cancelReason: statusForm.cancelReason,
      });
      const refundMsg = updated?.cancellationRefund?.message;
      if (refundMsg) {
        showSnackbar(refundMsg, updated.cancellationRefund.status === "COMPLETED" ? "success" : "info");
      } else {
        showSnackbar("Cập nhật trạng thái thành công");
      }
      setStatusDialogOpen(false);
      loadOrders();
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Cập nhật trạng thái thất bại", "error");
    }
  };

  const handleUpdatePaymentSubmit = async () => {
    try {
      await adminUpdatePaymentStatus(paymentForm.id, {
        paymentStatus: paymentForm.paymentStatus,
      });
      showSnackbar("Cập nhật thanh toán thành công");
      setPaymentDialogOpen(false);
      loadOrders();
    } catch (error) {
      showSnackbar("Cập nhật thanh toán thất bại", "error");
    }
  };

  const handleToggleVisibility = async (id, currentHidden) => {
    try {
      await adminUpdateVisibility(id, !currentHidden, !currentHidden ? "Ẩn theo yêu cầu Admin" : null);
      showSnackbar(!currentHidden ? "Đã chuyển vào thùng rác" : "Đã khôi phục đơn hàng");
      loadOrders();
    } catch (error) {
      showSnackbar("Thao tác thất bại", "error");
    }
  };

  return (
    <AdminLayout currentPage="Đơn hàng">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h4" fontWeight={950} color="#1e293b" sx={{ letterSpacing: -0.5, mb: 1 }}>
              {isTrashView ? "🗑️ Thùng Rác Đơn Hàng" : "📦 Quản Lý Đơn Hàng"}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ opacity: 0.8 }}>
              {isTrashView
                ? "Các đơn hàng đã bị ẩn khỏi hệ thống"
                : isSalesUser
                  ? "Chỉ hiển thị đơn được gán cho bạn — xác nhận / hủy / sửa giao hàng (PENDING, CONFIRMED)"
                  : isWarehouseUser
                    ? "Kho: đóng gói → giao → hoàn tất"
                    : "Theo dõi và quản lý tất cả đơn hàng từ khách hàng"}
            </Typography>
          </Box>
          {canHideOrders && (
            <Button
              variant={isTrashView ? "contained" : "outlined"}
              color="error"
              startIcon={isTrashView ? <RestoreIcon /> : <TrashIcon />}
              onClick={() => {
                setIsTrashView(!isTrashView);
                setPage(0);
              }}
            >
              {isTrashView ? "Quay lại danh sách chính" : "Xem thùng rác"}
            </Button>
          )}
        </Box>

        {/* Toolbar & Filters */}
        {!isTrashView && (
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <Tabs
              value={statusTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              {ORDER_STATUS_TABS.map((tab) => (
                <Tab key={tab.value} label={tab.label} value={tab.value} />
              ))}
            </Tabs>
            <CardContent>
              <Toolbar sx={{ px: 0, minHeight: "auto !important" }}>
                <TextField
                  placeholder="Tìm theo mã đơn, SĐT..."
                  variant="outlined"
                  size="small"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  sx={{ width: 350 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Toolbar>
            </CardContent>
          </Card>
        )}

        {/* Tables */}
        <Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã đơn</TableCell>
                  <TableCell>Khách hàng</TableCell>
                  <TableCell>Sản phẩm đầu tiên</TableCell>
                  <TableCell align="right">Tổng tiền</TableCell>
                  <TableCell align="center">Thanh toán</TableCell>
                  <TableCell align="center">Trạng thái</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      Không có đơn hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const payConf = getPaymentStatusConfig(order.paymentStatus);
                    const stConf = getOrderStatusConfig(order.status);
                    return (
                      <TableRow
                        key={order.id}
                        hover
                        sx={{
                          "&:hover": {
                            bgcolor: "rgba(242, 137, 0, 0.04) !important",
                          },
                          transition: "background-color 0.2s ease"
                        }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" color="primary" sx={{ cursor: "pointer" }} onClick={() => {
                            setSelectedOrderId(order.id);
                            setDetailOpen(true);
                          }}>
                            {order.orderCode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(order.orderDate).toLocaleString("vi-VN")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">{order.customerName}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">{order.shippingPhone}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            {order.firstItemImage && (
                              <img src={order.firstItemImage} alt={order.firstItemName} style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }} />
                            )}
                            <Box>
                              <Typography variant="body2" sx={{ maxWidth: 200, WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", display: "-webkit-box" }}>
                                {order.firstItemName}
                              </Typography>
                              {order.totalItems > 1 && (
                                <Typography variant="caption" color="text.secondary">
                                  + {order.totalItems - 1} sản phẩm khác
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {formatMoney(order.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={payConf.label}
                            size="small"
                            color={payConf.color || "default"}
                            onClick={
                              canUpdatePayment
                                ? () => {
                                    setPaymentForm({ id: order.id, paymentStatus: order.paymentStatus });
                                    setPaymentDialogOpen(true);
                                  }
                                : undefined
                            }
                            sx={{
                              cursor: canUpdatePayment ? "pointer" : "default",
                              ...payConf.sx,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                          <Tooltip
                            title={
                              salesQuickActions
                                ? "Sales: dùng nút Xác nhận / Hủy bên cạnh — không đổi trạng thái tùy ý"
                                : canClickStatusChip &&
                                    getAllowedNextStatuses(order.status, orderStatusCaps).length > 0
                                  ? "Cập nhật trạng thái"
                                  : ""
                            }
                          >
                            <Chip
                              label={stConf.label}
                              size="small"
                              color={stConf.color || "default"}
                              onClick={
                                canClickStatusChip &&
                                getAllowedNextStatuses(order.status, orderStatusCaps).length > 0
                                  ? () => {
                                      const next = getAllowedNextStatuses(order.status, orderStatusCaps);
                                      openStatusDialog(order, next[0] || order.status);
                                    }
                                  : undefined
                              }
                              sx={{
                                cursor:
                                  canClickStatusChip &&
                                  getAllowedNextStatuses(order.status, orderStatusCaps).length > 0
                                    ? "pointer"
                                    : "default",
                                ...stConf.sx,
                              }}
                            />
                          </Tooltip>
                          {(order.ghnShippingStatus || order.ghnShippingStatusDisplay) && (
                            <GhnStatusBadge
                              status={order.ghnShippingStatus}
                              statusDisplay={order.ghnShippingStatusDisplay}
                              updatedAt={order.ghnStatusUpdatedAt}
                              size="small"
                            />
                          )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small" color="primary" title="Xem chi tiết"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setDetailOpen(true);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                          {salesQuickActions && order.status === "PENDING" && (
                            <Tooltip title="Xác nhận đơn (Sales)">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleSalesConfirm(order)}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {salesQuickActions &&
                            ["PENDING", "CONFIRMED"].includes(order.status) && (
                            <Tooltip title="Hủy đơn (Sales)">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleSalesCancel(order)}
                              >
                                <CancelOrderIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canEditDelivery &&
                            (isFullAdmin || canSalesEditDelivery(order.status)) && (
                            <IconButton
                              size="small"
                              color="secondary"
                              title="Sửa giao hàng / ghi chú"
                              onClick={async () => {
                                try {
                                  const detail = await adminGetOrderDetail(order.id);
                                  setDeliveryEditOrder(detail);
                                  setDeliveryEditOpen(true);
                                } catch {
                                  showSnackbar("Không tải được chi tiết đơn", "error");
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {canHideOrders && (
                            <IconButton
                              size="small"
                              color={isTrashView ? "success" : "error"}
                              title={isTrashView ? "Khôi phục" : "Ẩn đơn hàng"}
                              onClick={() => handleToggleVisibility(order.id, order.isHidden || isTrashView)}
                            >
                              {isTrashView ? <RestoreIcon fontSize="small" /> : <TrashIcon fontSize="small" />}
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ borderTop: "1px solid rgba(224, 224, 224, 1)", bgcolor: "#fafafa" }}>
            <TablePagination
              component="div"
              count={totalElements}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Số dòng mỗi trang:"
              sx={{
                ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  fontWeight: 500,
                },
                ".MuiTablePagination-select": {
                  fontWeight: 600,
                  color: "primary.main",
                },
                ".MuiIconButton-root": {
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: "rgba(242, 137, 0, 0.08)",
                  },
                },
              }}
            />
          </Box>
        </Card>
      </Box>

      {/* Dialog Chi Tiết */}
      <AdminOrderDetailDialog
        open={detailOpen}
        orderId={selectedOrderId}
        onClose={() => setDetailOpen(false)}
      />

      <SalesDeliveryEditDialog
        open={deliveryEditOpen}
        order={deliveryEditOrder}
        onClose={() => {
          setDeliveryEditOpen(false);
          setDeliveryEditOrder(null);
        }}
        onSaved={() => {
          showSnackbar("Đã cập nhật thông tin giao hàng");
          loadOrders();
        }}
      />

      {/* Dialog Cập Nhật Trạng Thái Đơn */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {statusForm.status === "CONFIRMED"
            ? "Xác nhận đơn"
            : statusForm.status === "CANCELLED"
              ? "Hủy đơn"
              : "Cập nhật tiến trình"}
          : {statusForm.orderCode}
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái mới</InputLabel>
              <Select
                value={statusForm.status}
                label="Trạng thái mới"
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              >
                {(() => {
                  const currentStatus = statusForm.currentStatus;
                  const allowed = getAllowedNextStatuses(currentStatus, orderStatusCaps);
                  const options = ORDER_STATUS_TABS.filter(t => t.value !== "ALL" && allowed.includes(t.value));
                  
                  // Always include the current status itself so the placeholder works when nothing is changed yet
                  if (!allowed.includes(currentStatus) && currentStatus !== "ALL") {
                      const currentTab = ORDER_STATUS_TABS.find(t => t.value === currentStatus);
                      if (currentTab) options.unshift(currentTab);
                  }

                  return options.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ));
                })()}
              </Select>
            </FormControl>

            {statusForm.status === "SHIPPING" && (
              <TextField
                label="Mã Vận Đơn (Tracking Code)"
                value={statusForm.trackingCode}
                onChange={(e) => setStatusForm({ ...statusForm, trackingCode: e.target.value })}
                fullWidth
              />
            )}

            {statusForm.status === "CANCELLED" && (
              <TextField
                label="Lý do hủy đơn"
                required
                value={statusForm.cancelReason}
                onChange={(e) => setStatusForm({ ...statusForm, cancelReason: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            )}

            <TextField
              label="Ghi chú nội bộ (Admin Note)"
              value={statusForm.adminNote}
              onChange={(e) => setStatusForm({ ...statusForm, adminNote: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleUpdateStatusSubmit} variant="contained">Lưu Cập Nhật</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cập Nhật Thanh Toán */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cập Nhật Thanh Toán</DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái thanh toán</InputLabel>
              <Select
                value={paymentForm.paymentStatus}
                label="Trạng thái thanh toán"
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentStatus: e.target.value })}
              >
                <MenuItem value="PENDING">Chưa thanh toán</MenuItem>
                <MenuItem value="PAID">Đã thanh toán</MenuItem>
                <MenuItem value="FAILED">Giao dịch lỗi</MenuItem>
                <MenuItem value="REFUNDED">Đã hoàn tiền</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleUpdatePaymentSubmit} variant="contained">Cập Nhật</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
};

export default OrderManagementPage;
