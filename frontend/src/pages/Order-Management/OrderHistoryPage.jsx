import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Pagination,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import ProfileMenu from "../../components/Profile-Menu/ProfileMenu.jsx";
import { selectUser } from "../../redux/appSlice";
import {
  cancelOrder,
  getMyOrders,
  getOrderDetail,
  createRetryPayment,
} from "../../services/orderService";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import PaymentIcon from "@mui/icons-material/Payment";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import TrackingTimeline from "../../components/TrackingTimeline/TrackingTimeline";
import WarrantyClaimFromOrderDialog from "../../components/Warranty/WarrantyClaimFromOrderDialog";
import { canRequestWarrantyForItem } from "../../utils/warrantyFromOrder";

// ─── Tabs trạng thái ─────────────────────────────────────────────────────────
const STATUS_TABS = [
  { label: "Tất cả", value: null },
  { label: "Chờ xác nhận", value: "PENDING" },
  { label: "Đã xác nhận", value: "CONFIRMED" },
  { label: "Đang xử lý", value: "PROCESSING" },
  { label: "Đang giao", value: "SHIPPING" },
  { label: "Đã giao", value: "DELIVERED" },
  { label: "Hoàn thành", value: "COMPLETED" },
  { label: "Đã hủy", value: "CANCELLED" },
];

const PAGE_SIZE = 5;

// ─── Màu Chip theo trạng thái ────────────────────────────────────────────────
const getStatusChipColor = (status) => {
  const map = {
    PENDING: "warning",
    CONFIRMED: "info",
    PROCESSING: "info",
    SHIPPING: "primary",
    DELIVERED: "success",
    COMPLETED: "success",
    CANCELLED: "error",
    REFUNDED: "default",
  };
  return map[status] || "default";
};

const getPaymentStatusLabel = (ps) => {
  const map = {
    PENDING: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thanh toán thất bại",
    REFUNDED: "Đã hoàn tiền",
  };
  return map[ps] || ps;
};

const getPaymentMethodLabel = (pm) => {
  const map = {
    COD: "Thanh toán khi nhận hàng",
    BANK_TRANSFER: "Chuyển khoản ngân hàng",
    MOMO: "Ví MoMo",
    VNPAY: "VNPay",
    ZALOPAY: "ZaloPay",
  };
  return map[pm] || pm;
};

// ═════════════════════════════════════════════════════════════════════════════
// ORDER LIST COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const OrderList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Chi tiết đơn hàng (accordion mở rộng)
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Hủy đơn hàng dialog
  const [cancelDialog, setCancelDialog] = useState({
    open: false,
    orderId: null,
    orderCode: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Thanh toán lại
  const [retryLoading, setRetryLoading] = useState(false);

  // Yêu cầu bảo hành từ dòng sản phẩm
  const [claimDialog, setClaimDialog] = useState({ open: false, context: null });

  // ─── Fetch danh sách đơn hàng ───
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const status = STATUS_TABS[activeTab].value;
      const data = await getMyOrders(page - 1, PAGE_SIZE, status);
      setOrders(data?.content || []);
      setTotalPages(data?.totalPages || 0);
    } catch (err) {
      console.error("Lỗi load đơn hàng:", err);
      setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Tab change → reset page ───
  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    setPage(1);
    setExpandedOrderId(null);
    setOrderDetail(null);
  };

  // ─── Mở rộng xem chi tiết ───
  const handleAccordionToggle = async (order) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      setOrderDetail(null);
      return;
    }
    setExpandedOrderId(order.id);
    setDetailLoading(true);
    try {
      const detail = await getOrderDetail(order.orderCode);
      setOrderDetail(detail);
    } catch (err) {
      console.error("Lỗi load chi tiết:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Hủy đơn hàng ───
  const openCancelDialog = (order) => {
    setCancelDialog({
      open: true,
      orderId: order.id,
      orderCode: order.orderCode,
    });
    setCancelReason("");
  };

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    try {
      await cancelOrder(cancelDialog.orderId, cancelReason.trim() || null);
      setCancelDialog({ open: false, orderId: null, orderCode: "" });
      fetchOrders(); // refresh danh sách
    } catch (err) {
      console.error("Lỗi hủy đơn:", err);
    } finally {
      setCancelLoading(false);
    }
  };

  // ─── Thanh toán lại ───
  const handleRetryPayment = async (orderCode) => {
    setRetryLoading(true);
    try {
      const resp = await createRetryPayment({ orderCode, bankCode: "", language: "vn" });
      if (resp?.paymentUrl) {
        window.location.href = resp.paymentUrl;
      } else {
        setError("Không thể tạo link thanh toán mới.");
      }
    } catch (err) {
      console.error("Lỗi retry payment:", err);
      setError("Thanh toán lại thất bại. Vui lòng thử lại!");
    } finally {
      setRetryLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <InventoryOutlinedIcon sx={{ color: "#f28900", fontSize: 28 }} />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Đơn Hàng Của Tôi
        </Typography>
      </Box>

      {/* Tabs trạng thái */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        {STATUS_TABS.map((tab) => (
          <Tab label={tab.label} key={tab.label} />
        ))}
      </Tabs>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: "#f28900" }} />
        </Box>
      )}

      {/* Error */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Danh sách đơn hàng */}
      {!loading && !error && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {orders.length > 0 ? (
            orders.map((order) => (
              <Accordion
                key={order.id}
                expanded={expandedOrderId === order.id}
                onChange={() => handleAccordionToggle(order)}
                variant="outlined"
                disableGutters
                sx={{
                  borderRadius: 3,
                  "&:before": { display: "none" },
                  border: expandedOrderId === order.id ? "1px solid #f28900" : "1px solid #e0e0e0",
                  boxShadow: expandedOrderId === order.id ? "0 6px 16px rgba(242, 137, 0, 0.12)" : "none",
                  transition: "all 0.3s ease",
                  overflow: "hidden"
                }}
              >
                {/* ── Header đơn hàng ── */}
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ px: 2.5, py: 1 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      gap: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Ảnh sản phẩm đầu tiên */}
                    <Avatar
                      src={order.firstItemImage}
                      variant="rounded"
                      sx={{ width: 56, height: 56, border: "1px solid #eee" }}
                    />

                    {/* Thông tin chính */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {order.firstItemName}
                        {order.totalItems > 1 && (
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ color: "#888", ml: 1 }}
                          >
                            +{order.totalItems - 1} sản phẩm khác
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        #{order.orderCode} &middot;{" "}
                        {formatDateTime(order.orderDate)}
                      </Typography>
                    </Box>

                    {/* Tổng tiền */}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: "#f28900",
                        minWidth: 120,
                        textAlign: "right",
                      }}
                    >
                      {formatMoney(order.totalAmount)}
                    </Typography>

                    {/* Chip trạng thái */}
                    <Chip
                      label={order.statusDisplay || order.status}
                      color={getStatusChipColor(order.status)}
                      size="small"
                      sx={{ fontWeight: 600, minWidth: 90 }}
                    />

                    {/* Nút hủy (chỉ hiện cho PENDING hoặc CONFIRMED) */}
                    {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<CancelOutlinedIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancelDialog(order);
                        }}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          borderRadius: 2,
                        }}
                      >
                        Hủy đơn
                      </Button>
                    )}
                  </Box>
                </AccordionSummary>

                {/* ── Chi tiết đơn hàng (khi mở rộng) ── */}
                <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
                  <Divider sx={{ mb: 2 }} />

                  {detailLoading ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        py: 3,
                      }}
                    >
                      <CircularProgress size={28} sx={{ color: "#f28900" }} />
                    </Box>
                  ) : orderDetail ? (
                    <>
                      {/* Danh sách sản phẩm */}
                      {orderDetail.items?.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            py: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Avatar
                              src={item.imageUrl}
                              variant="rounded"
                              sx={{
                                width: 52,
                                height: 52,
                                border: "1px solid #eee",
                              }}
                            />
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {item.productName}
                              </Typography>
                              {item.variantName && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Phân loại: {item.variantName}
                                </Typography>
                              )}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                {formatMoney(item.unitPrice)} x {item.quantity}
                              </Typography>

                              {/* Hiển thị Mã máy đã giao (IMEI) */}
                              {['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(orderDetail.status) && item.assignedImeis && item.assignedImeis.length > 0 && (
                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#f5f5fa", borderRadius: 2, border: "1px dashed #cdd" }}>
                                  <Typography variant="caption" fontWeight="bold" color="primary.main" display="block" gutterBottom>
                                    📋 Mã máy đã giao:
                                  </Typography>
                                  {item.assignedImeis.map((imei, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: "#333" }}>
                                        • IMEI/Serial: {imei}
                                      </Typography>
                                      <Button 
                                        size="small" 
                                        sx={{ minWidth: "auto", px: 1, py: 0.2, fontSize: "0.7rem", borderRadius: 1 }} 
                                        variant="outlined"
                                        onClick={() => { 
                                          navigator.clipboard.writeText(imei); 
                                          toast.success("Đã copy mã máy: " + imei); 
                                        }}
                                      >
                                        📋 Copy
                                      </Button>
                                      <Button 
                                        size="small" 
                                        sx={{ minWidth: "auto", px: 1, py: 0.2, fontSize: "0.7rem", borderRadius: 1 }} 
                                        variant="outlined"
                                        onClick={() => window.open(`/warranty-check?code=${imei}`, '_blank')}
                                      >
                                        🔍 Tra cứu BH
                                      </Button>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatMoney(item.totalPrice)}
                            </Typography>
                            {canRequestWarrantyForItem(orderDetail.status, item.assignedImeis) && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={<BuildOutlinedIcon />}
                                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, whiteSpace: "nowrap" }}
                                onClick={() =>
                                  setClaimDialog({
                                    open: true,
                                    context: {
                                      orderId: orderDetail.id,
                                      orderDetailId: item.id,
                                      orderCode: orderDetail.orderCode,
                                      productName: item.productName,
                                      imei: item.assignedImeis[0],
                                    },
                                  })
                                }
                              >
                                Yêu cầu BH / Sửa chữa
                              </Button>
                            )}
                            {["DELIVERED", "COMPLETED", "SHIPPING"].includes(orderDetail.status) &&
                              (!item.assignedImeis || item.assignedImeis.length === 0) && (
                              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160 }}>
                                Chưa có IMEI — bảo hành sau khi shop gán mã máy
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}

                      <Divider sx={{ my: 2 }} />

                      {/* Thông tin tóm tắt */}
                      <Grid container spacing={2}>
                        {/* Cột trái: Thông tin giao hàng */}
                        <Grid item xs={12} sm={6}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, mb: 1 }}
                          >
                            Thông tin giao hàng
                          </Typography>
                          <Typography variant="body2">
                            {orderDetail.shippingName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {orderDetail.shippingPhone}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {[
                              orderDetail.shippingAddress,
                              orderDetail.shippingWard,
                              orderDetail.shippingDistrict,
                              orderDetail.shippingProvince,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </Typography>

                          {/* Tracking Timeline */}
                          {['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(orderDetail.status) && orderDetail.trackingCode && (
                            <Box sx={{ mt: 2 }}>
                              <TrackingTimeline trackingCode={orderDetail.trackingCode} />
                            </Box>
                          )}

                          {orderDetail.note && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5, fontStyle: "italic" }}
                            >
                              Ghi chú: {orderDetail.note}
                            </Typography>
                          )}
                          {orderDetail.cancelReason && (
                            <Typography
                              variant="body2"
                              color="error"
                              sx={{ mt: 0.5 }}
                            >
                              Lý do hủy: {orderDetail.cancelReason}
                            </Typography>
                          )}
                        </Grid>

                        {/* Cột phải: Thanh toán + Tổng tiền */}
                        <Grid item xs={12} sm={6}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, mb: 1 }}
                          >
                            Thanh toán
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Phương thức:{" "}
                            {getPaymentMethodLabel(orderDetail.paymentMethod)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Trạng thái:{" "}
                            {getPaymentStatusLabel(orderDetail.paymentStatus)}
                          </Typography>

                          <Box sx={{ mt: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Tạm tính
                              </Typography>
                              <Typography variant="body2">
                                {formatMoney(orderDetail.subtotal)}
                              </Typography>
                            </Box>
                            {orderDetail.discountAmount > 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#2e7d32" }}
                                >
                                  Giảm giá
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#2e7d32" }}
                                >
                                  -{formatMoney(orderDetail.discountAmount)}
                                </Typography>
                              </Box>
                            )}
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Phí vận chuyển
                              </Typography>
                              <Typography variant="body2">
                                {orderDetail.shippingFee > 0
                                  ? formatMoney(orderDetail.shippingFee)
                                  : "Miễn phí"}
                              </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 700 }}
                              >
                                Tổng cộng
                              </Typography>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 700, color: "#f28900" }}
                              >
                                {formatMoney(orderDetail.totalAmount)}
                              </Typography>
                            </Box>

                            {/* Nút Retry Payment nếu chưa thanh toán (và là đơn ONLINE) */}
                            {orderDetail.status !== "CANCELLED" && orderDetail.paymentStatus === "PENDING" && orderDetail.paymentMethod !== "COD" && (
                              <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="large"
                                  startIcon={<PaymentIcon />}
                                  onClick={() => handleRetryPayment(orderDetail.orderCode)}
                                  disabled={retryLoading}
                                  sx={{ fontWeight: "bold", textTransform: "none", width: "100%", py: 1.5, borderRadius: 2 }}
                                >
                                  {retryLoading ? <CircularProgress size={24} color="inherit" /> : "Thanh Toán Ngay"}
                                </Button>
                              </Box>
                            )}

                          </Box>
                        </Grid>
                      </Grid>
                    </>
                  ) : null}
                </AccordionDetails>
              </Accordion>
            ))
          ) : (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <InventoryOutlinedIcon
                sx={{ fontSize: 60, color: "#ccc", mb: 1 }}
              />
              <Typography color="text.secondary">
                Không có đơn hàng nào trong mục này.
              </Typography>
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      {/* ── Dialog hủy đơn hàng ── */}
      <Dialog
        open={cancelDialog.open}
        onClose={() =>
          setCancelDialog({ open: false, orderId: null, orderCode: "" })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Hủy đơn hàng #{cancelDialog.orderCode}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bạn có chắc muốn hủy đơn hàng này? Hành động này không thể hoàn tác.
          </Typography>
          <TextField
            label="Lý do hủy (không bắt buộc)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() =>
              setCancelDialog({ open: false, orderId: null, orderCode: "" })
            }
            sx={{ textTransform: "none" }}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelOrder}
            disabled={cancelLoading}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {cancelLoading ? (
              <CircularProgress size={20} sx={{ color: "#fff" }} />
            ) : (
              "Xác nhận hủy"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <WarrantyClaimFromOrderDialog
        open={claimDialog.open}
        context={claimDialog.context}
        onClose={() => setClaimDialog({ open: false, context: null })}
      />
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
const OrderHistoryPage = () => {
  const user = useSelector(selectUser);

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, md: 3 },
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "stretch",
          gap: 0,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {/* Cột trái: Menu User */}
        <Box
          sx={{
            width: { xs: "100%", md: 260 },
            minWidth: { md: 260 },
          }}
        >
          <ProfileMenu activePage="Đơn Hàng" user={user} />
        </Box>

        {/* Cột phải: Đơn hàng */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: { xs: "100%", md: "auto" },
            maxHeight: { md: "80vh" },
            overflowY: { md: "auto" },
            /* Custom scrollbar nhỏ gọn */
            "&::-webkit-scrollbar": {
              width: 6,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#f0f0f0",
              borderRadius: 3,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#c0c0c0",
              borderRadius: 3,
              "&:hover": {
                backgroundColor: "#a0a0a0",
              },
            },
          }}
        >
          <OrderList />
        </Box>
      </Box>
    </Box>
  );
};

export default OrderHistoryPage;
