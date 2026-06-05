import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Build as RepairIcon } from "@mui/icons-material";
import { selectUser } from "../../redux/appSlice";
import { submitWarrantyClaim } from "../../services/warrantyService";
import { isApiSuccess } from "../../utils/apiResponse";

/**
 * Gửi yêu cầu BH từ Đơn hàng của tôi — đã gắn orderId, orderDetailId, IMEI.
 */
const WarrantyClaimFromOrderDialog = ({ open, onClose, context }) => {
  const user = useSelector(selectUser);
  const [form, setForm] = useState({
    submittedImei: "",
    issueDescription: "",
    issueType: "NOT_WORKING",
    customerRequest: "REPAIR",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    imageUrl1: "",
    videoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successClaim, setSuccessClaim] = useState(null);

  useEffect(() => {
    if (!open || !context) return;
    setError("");
    setSuccessClaim(null);
    setForm({
      submittedImei: context.imei || "",
      issueDescription: "",
      issueType: "NOT_WORKING",
      customerRequest: "REPAIR",
      contactName: user?.name || user?.fullName || "",
      contactPhone: user?.phone || "",
      contactEmail: user?.email || "",
      imageUrl1: "",
      videoUrl: "",
    });
  }, [open, context, user]);

  const handleSubmit = async () => {
    if (!form.submittedImei?.trim() || !form.issueDescription?.trim()) {
      setError("Vui lòng nhập IMEI và mô tả lỗi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await submitWarrantyClaim({
        submittedImei: form.submittedImei.trim(),
        orderId: context.orderId,
        orderDetailId: context.orderDetailId,
        issueDescription: form.issueDescription.trim(),
        issueType: form.issueType,
        customerRequest: form.customerRequest,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail,
        imageUrl1: form.imageUrl1 || undefined,
        videoUrl: form.videoUrl || undefined,
      });
      if (isApiSuccess(res)) {
        setSuccessClaim(res.data?.claimNumber || "OK");
      } else {
        setError(res.message || "Gửi thất bại");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!context) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <RepairIcon color="primary" />
        Yêu cầu bảo hành / Sửa chữa
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Đơn <strong>#{context.orderCode}</strong> · {context.productName}
        </Alert>

        {successClaim ? (
          <Alert severity="success">
            Đã tạo ticket <strong>#{successClaim}</strong>. Sales sẽ liên hệ bạn trong 24–48 giờ.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="IMEI / Serial máy cần bảo hành"
              required
              fullWidth
              size="small"
              value={form.submittedImei}
              onChange={(e) => setForm({ ...form, submittedImei: e.target.value })}
              helperText="Lấy từ đơn hàng — có thể sửa nếu nhập nhầm"
            />
            <TextField
              label="Mô tả lỗi"
              required
              fullWidth
              multiline
              rows={3}
              value={form.issueDescription}
              onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
              placeholder='VD: "Máy tự sập nguồn khi sạc"'
            />
            <TextField
              select
              label="Loại sự cố"
              fullWidth
              size="small"
              value={form.issueType}
              onChange={(e) => setForm({ ...form, issueType: e.target.value })}
            >
              <MenuItem value="NOT_WORKING">Không hoạt động</MenuItem>
              <MenuItem value="DEFECTIVE">Lỗi kỹ thuật</MenuItem>
              <MenuItem value="DAMAGED">Hư hỏng vật lý</MenuItem>
              <MenuItem value="MISSING_PARTS">Thiếu phụ kiện</MenuItem>
              <MenuItem value="OTHER">Khác</MenuItem>
            </TextField>
            <TextField
              select
              label="Yêu cầu xử lý"
              fullWidth
              size="small"
              value={form.customerRequest}
              onChange={(e) => setForm({ ...form, customerRequest: e.target.value })}
            >
              <MenuItem value="REPAIR">Sửa chữa</MenuItem>
              <MenuItem value="REPLACE">Đổi máy mới</MenuItem>
              <MenuItem value="REFUND">Hoàn tiền</MenuItem>
            </TextField>
            <TextField
              label="Link ảnh hóa đơn / vỏ hộp"
              fullWidth
              size="small"
              value={form.imageUrl1}
              onChange={(e) => setForm({ ...form, imageUrl1: e.target.value })}
            />
            <TextField
              label="Link video quay lỗi"
              fullWidth
              size="small"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{successClaim ? "Đóng" : "Hủy"}</Button>
        {!successClaim && (
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WarrantyClaimFromOrderDialog;
