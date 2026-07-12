import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { AssignmentReturn as ReturnIcon } from "@mui/icons-material";
import {
  RETURN_REASON_OPTIONS,
  createReturnRequest,
  markReturnRequestShipped,
  cancelReturnRequest,
} from "../../services/customerReturnRequestService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";

const SHIP_DEADLINE_DAYS = 7;

const ReturnRequestFromOrderDialog = ({ open, onClose, context, existingRequest, onSuccess }) => {
  const [reasonType, setReasonType] = useState("CHANGE_OF_MIND");
  const [reasonDetail, setReasonDetail] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(existingRequest || null);

  useEffect(() => {
    if (open) {
      setDetail(existingRequest || null);
      setError("");
    }
  }, [open, existingRequest]);

  const isViewMode = Boolean(detail);
  const canShip = detail?.canCustomerShip;
  const canCancel = detail?.canCustomerCancel;

  const handleClose = () => {
    setError("");
    setReasonType("CHANGE_OF_MIND");
    setReasonDetail("");
    setReturnTracking("");
    setDetail(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!context?.orderCode || !context?.serialNumber) {
      setError("Thiếu thông tin đơn hàng hoặc Serial.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await createReturnRequest({
        orderCode: context.orderCode,
        serialNumber: context.serialNumber,
        reasonType,
        reasonDetail: reasonDetail.trim() || undefined,
      });
      if (isApiSuccess(res)) {
        setDetail(res.data);
        onSuccess?.(res.data);
      } else {
        setError(res?.message || "Gửi yêu cầu thất bại.");
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Gửi yêu cầu trả hàng thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkShipped = async () => {
    if (!detail?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await markReturnRequestShipped(detail.id, returnTracking.trim());
      if (isApiSuccess(res)) {
        setDetail(res.data);
        onSuccess?.(res.data);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Cập nhật thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!detail?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await cancelReturnRequest(detail.id);
      if (isApiSuccess(res)) {
        setDetail(res.data);
        onSuccess?.(res.data);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Hủy yêu cầu thất bại."));
    } finally {
      setLoading(false);
    }
  };

  if (!context && !detail) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle component="div">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReturnIcon color="error" />
          <Typography component="span" variant="h6" fontWeight={700}>
            {isViewMode ? `Yêu cầu trả hàng ${detail.requestCode}` : "Yêu cầu trả hàng & hoàn tiền"}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 2, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">Đơn hàng</Typography>
          <Typography fontWeight={700}>{context?.orderCode || detail?.orderCode}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {context?.productName || detail?.productName}
            {(context?.variantName || detail?.variantName) && ` — ${context?.variantName || detail?.variantName}`}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", mt: 0.5 }}>
            Serial: {context?.serialNumber || detail?.serialNumber}
          </Typography>
        </Box>

        {isViewMode ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Chip label={detail.statusLabel} color="primary" sx={{ alignSelf: "flex-start" }} />
            <Typography variant="body2">
              <strong>Lý do:</strong> {detail.reasonTypeLabel}
              {detail.reasonDetail ? ` — ${detail.reasonDetail}` : ""}
            </Typography>
            {detail.status === "PENDING_SALES_REVIEW" && (
              <Alert severity="info">
                Yêu cầu đang chờ <strong>Sales</strong> xem xét. Bạn sẽ được thông báo khi có phản hồi.
              </Alert>
            )}
            {detail.status === "APPROVED" && (
              <Alert severity="success">
                Sales đã duyệt. Vui lòng đóng gói và gửi hàng về shop trong{" "}
                <strong>{detail.daysLeftToShip ?? SHIP_DEADLINE_DAYS} ngày</strong>
                {detail.shipDeadline && ` (hạn: ${new Date(detail.shipDeadline).toLocaleDateString("vi-VN")})`}.
                {detail.salesResponseNote && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Ghi chú Sales: {detail.salesResponseNote}
                  </Typography>
                )}
              </Alert>
            )}
            {detail.status === "REJECTED" && (
              <Alert severity="error">
                Sales từ chối: {detail.rejectionReason}
              </Alert>
            )}
            {detail.status === "SHIPPED_BY_CUSTOMER" && (
              <Alert severity="info">
                Đã ghi nhận bạn gửi hàng về. Kho sẽ kiểm tra khi nhận được hàng.
                {detail.customerReturnTracking && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Mã vận đơn trả: {detail.customerReturnTracking}
                  </Typography>
                )}
              </Alert>
            )}
            {canShip && (
              <TextField
                label="Mã vận đơn gửi trả (tuỳ chọn)"
                fullWidth
                size="small"
                value={returnTracking}
                onChange={(e) => setReturnTracking(e.target.value)}
                placeholder="GHN/J&T/..."
              />
            )}
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Sau khi Sales duyệt, bạn có <strong>{SHIP_DEADLINE_DAYS} ngày</strong> để đóng gói và gửi hàng về kho.
              Kho kiểm tra xong mới tiến hành hoàn tiền.
            </Alert>
            <TextField
              select
              fullWidth
              label="Lý do trả hàng"
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
              sx={{ mb: 2 }}
            >
              {RETURN_REASON_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Mô tả thêm (tuỳ chọn)"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="Ví dụ: Không thích màu xanh, hộp còn nguyên seal..."
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Đóng</Button>
        {canCancel && (
          <Button color="error" onClick={handleCancel} disabled={loading}>
            Hủy yêu cầu
          </Button>
        )}
        {canShip && (
          <Button variant="contained" onClick={handleMarkShipped} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Đã gửi hàng về shop"}
          </Button>
        )}
        {!isViewMode && (
          <Button variant="contained" color="error" onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Gửi yêu cầu"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReturnRequestFromOrderDialog;
