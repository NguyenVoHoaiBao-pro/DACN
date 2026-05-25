/**
 * ADMIN ORDER DETAIL DIALOG — Phase 2
 *
 * Dialog hiển thị chi tiết đơn hàng + Gán IMEI cho từng dòng sản phẩm (API 4)
 *
 * Luồng:
 *  1. Admin mở dialog chi tiết đơn hàng
 *  2. Với mỗi OrderItem chưa gán đủ IMEI, hiển thị textarea để nhập/quét
 *  3. Gọi API POST /api/admin/orders/{orderId}/assign-imei
 *  4. Backend trả về toàn bộ order mới → refresh UI
 */

import {
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
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  QrCode2 as QrIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminAssignImei, adminGetOrderDetail } from "../../services/orderService";
import { formatMoney } from "../../utils/formatters";
import TrackingTimeline from "../../components/TrackingTimeline/TrackingTimeline";

// ─── IMEI Assignment Status Badge ───
const ImeiStatusBadge = ({ assignedCount, totalCount }) => {
  if (assignedCount === 0) {
    return (
      <Chip
        icon={<ErrorIcon sx={{ fontSize: 16 }} />}
        label={`Chưa gán (0/${totalCount})`}
        color="error"
        size="small"
        variant="filled"
        sx={{ fontWeight: 600 }}
      />
    );
  }
  if (assignedCount < totalCount) {
    return (
      <Chip
        icon={<WarningIcon sx={{ fontSize: 16 }} />}
        label={`Gán một phần (${assignedCount}/${totalCount})`}
        color="warning"
        size="small"
        variant="filled"
        sx={{ fontWeight: 600 }}
      />
    );
  }
  return (
    <Chip
      icon={<CheckIcon sx={{ fontSize: 16 }} />}
      label={`Đã gán đủ (${totalCount}/${totalCount})`}
      color="success"
      size="small"
      variant="filled"
      sx={{ fontWeight: 600 }}
    />
  );
};

const AdminOrderDetailDialog = ({ open, orderId, onClose }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imeiInputs, setImeiInputs] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    if (open && orderId) {
      fetchDetail();
    } else {
      setOrder(null);
      setImeiInputs({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await adminGetOrderDetail(orderId);
      setOrder(data);
    } catch (error) {
      console.error("Failed to fetch order detail", error);
      toast.error("Không thể tải chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // API 4: Gán IMEI cho đơn hàng
  // POST /api/admin/orders/{orderId}/assign-imei
  // ═══════════════════════════════════════════════════════════════════════
  const handleAssignImei = async (orderDetailId) => {
    const textValue = imeiInputs[orderDetailId] || "";
    const imeis = textValue
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (imeis.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 mã IMEI/Serial");
      return;
    }

    setAssigningId(orderDetailId);
    try {
      const data = await adminAssignImei(orderId, { orderDetailId, imeis });
      // Backend trả về toàn bộ order mới → update state
      setOrder(data);
      setImeiInputs((prev) => ({ ...prev, [orderDetailId]: "" }));
      toast.success(`✅ Đã gán ${imeis.length} mã IMEI thành công!`);
    } catch (error) {
      const respData = error.response?.data;
      if (respData?.error) {
        // Validation errors
        const messages = Object.values(respData.error).join("; ");
        toast.error(messages);
      } else {
        toast.error(respData?.message || "Có lỗi xảy ra khi gán IMEI.");
      }
    } finally {
      setAssigningId(null);
    }
  };

  // Copy IMEI list to clipboard
  const handleCopyImeis = (imeis) => {
    navigator.clipboard.writeText(imeis.join("\n"));
    toast.info("Đã copy danh sách IMEI!");
  };

  if (!order && !loading) return null;

  // Check if the order status allows IMEI assignment
  const canAssignImeiForOrder =
    order?.status === "CONFIRMED" || order?.status === "PROCESSING";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          overflow: "hidden",
        },
      }}
    >
      {/* ── HEADER ── */}
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #f28900, #ffb74d)",
          color: "#fff",
          fontWeight: "bold",
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QrIcon />
          Chi Tiết Đơn Hàng #{order?.orderCode}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#ff9f1a" }} />
          </Box>
        ) : (
          <Box>
            {/* ── CUSTOMER & ORDER INFO ── */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="h6"
                  gutterBottom
                  color="primary.main"
                  fontWeight="600"
                >
                  Thông tin khách hàng
                </Typography>
                <Typography>
                  <strong>Họ tên:</strong> {order.customerName}
                </Typography>
                <Typography>
                  <strong>Điện thoại:</strong> {order.shippingPhone}
                </Typography>
                <Typography>
                  <strong>Địa chỉ:</strong> {order.shippingAddress},{" "}
                  {order.shippingWard}, {order.shippingDistrict},{" "}
                  {order.shippingProvince}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="h6"
                  gutterBottom
                  color="primary.main"
                  fontWeight="600"
                >
                  Thông tin đơn hàng
                </Typography>
                <Typography>
                  <strong>Ngày đặt:</strong>{" "}
                  {new Date(order.orderDate).toLocaleString("vi-VN")}
                </Typography>
                <Typography>
                  <strong>Trạng thái:</strong> {order.statusDisplay}
                </Typography>
                <Typography>
                  <strong>Phương thức:</strong> {order.paymentMethod}
                </Typography>
                <Typography>
                  <strong>Trạng thái TT:</strong> {order.paymentStatus}
                </Typography>
                {order.trackingCode && (
                  <Typography>
                    <strong>Mã vận đơn:</strong> {order.trackingCode}
                  </Typography>
                )}
                {order.cancelReason && (
                  <Typography color="error">
                    <strong>Lý do hủy:</strong> {order.cancelReason}
                  </Typography>
                )}
                {order.adminNote && (
                  <Typography>
                    <strong>Ghi chú admin:</strong> {order.adminNote}
                  </Typography>
                )}
              </Grid>

              {/* ── TRACKING TIMELINE ── */}
              {['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order.status) && order.trackingCode && (
                <Grid item xs={12}>
                  <TrackingTimeline trackingCode={order.trackingCode} />
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* ── PRODUCT ITEMS & IMEI ASSIGNMENT ── */}
            <Typography variant="h6" gutterBottom color="primary.main" fontWeight="600">
              Danh Sách Sản Phẩm & Gán IMEI
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {order.items?.map((item) => {
                const assignedCount = item.assignedImeis
                  ? item.assignedImeis.length
                  : 0;
                const totalCount = item.quantity;
                const isFullyAssigned = assignedCount >= totalCount;
                const canAssignImei = canAssignImeiForOrder && !isFullyAssigned;
                const remaining = totalCount - assignedCount;

                return (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Grid container spacing={3}>
                      {/* ── Product Info ── */}
                      <Grid item xs={12} md={5}>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid #eee",
                            }}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {item.productName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {item.variantName
                                ? `Phân loại: ${item.variantName}`
                                : ""}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              SKU: {item.skuCode} | SL: {item.quantity} | Đơn giá:{" "}
                              {formatMoney(item.unitPrice)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Thành tiền:{" "}
                              <Typography component="span" fontWeight="bold" color="primary.main">
                                {formatMoney(item.totalPrice)}
                              </Typography>
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* ── IMEI Section ── */}
                      <Grid item xs={12} md={7}>
                        <Box
                          sx={{
                            bgcolor: isFullyAssigned ? "#f0fdf4" : "#fffbeb",
                            p: 2,
                            borderRadius: 2,
                            border: `1px solid ${isFullyAssigned ? "#bbf7d0" : "#fde68a"}`,
                            height: "100%",
                          }}
                        >
                          {/* Status Badge */}
                          <Box sx={{ mb: 1.5 }}>
                            <ImeiStatusBadge
                              assignedCount={assignedCount}
                              totalCount={totalCount}
                            />
                          </Box>

                          {/* Assigned IMEI List */}
                          {item.assignedImeis && item.assignedImeis.length > 0 && (
                            <Box
                              sx={{
                                border: "1px dashed #d1d5db",
                                borderRadius: 1.5,
                                p: 1,
                                mb: 1.5,
                                maxHeight: 100,
                                overflowY: "auto",
                                bgcolor: "#fff",
                                position: "relative",
                              }}
                            >
                              <Tooltip title="Copy tất cả">
                                <IconButton
                                  size="small"
                                  sx={{ position: "absolute", top: 2, right: 2 }}
                                  onClick={() => handleCopyImeis(item.assignedImeis)}
                                >
                                  <CopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              {item.assignedImeis.map((imei, idx) => (
                                <Typography
                                  key={idx}
                                  variant="body2"
                                  sx={{ fontFamily: "monospace", color: "#166534", lineHeight: 1.6 }}
                                >
                                  {idx + 1}. {imei}
                                </Typography>
                              ))}
                            </Box>
                          )}

                          {/* Assign Input */}
                          {canAssignImei && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                                Cần gán thêm <strong>{remaining}</strong> IMEI nữa. Nhập mỗi dòng 1 mã:
                              </Typography>
                              <TextField
                                id={`imei-input-${item.id}`}
                                size="small"
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Quét hoặc nhập IMEI tại đây (mỗi dòng 1 mã)..."
                                value={imeiInputs[item.id] || ""}
                                onChange={(e) =>
                                  setImeiInputs({
                                    ...imeiInputs,
                                    [item.id]: e.target.value,
                                  })
                                }
                                sx={{
                                  mb: 1,
                                  bgcolor: "#fff",
                                  "& .MuiOutlinedInput-root": {
                                    fontFamily: "'Consolas', monospace",
                                    fontSize: "0.85rem",
                                    borderRadius: 1.5,
                                  },
                                }}
                              />
                              <Button
                                id={`assign-btn-${item.id}`}
                                variant="contained"
                                color="primary"
                                size="small"
                                fullWidth
                                disabled={assigningId === item.id}
                                onClick={() => handleAssignImei(item.id)}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: "bold",
                                  borderRadius: 1.5,
                                  bgcolor: "#ff9f1a",
                                  "&:hover": { bgcolor: "#e68a00" },
                                }}
                              >
                                {assigningId === item.id ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  "✅ Gán IMEI"
                                )}
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Box>

            {/* ── ORDER TOTAL ── */}
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Box sx={{ minWidth: 250 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Tạm tính:</Typography>
                  <Typography>
                    {formatMoney(order.subtotal || order.totalAmount)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Phí giao hàng:</Typography>
                  <Typography>{formatMoney(order.shippingFee || 0)}</Typography>
                </Box>
                {order.discountAmount > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography>Giảm giá:</Typography>
                    <Typography color="error">
                      -{formatMoney(order.discountAmount)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6" fontWeight="bold">
                    Tổng cộng:
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {formatMoney(order.totalAmount)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminOrderDetailDialog;
