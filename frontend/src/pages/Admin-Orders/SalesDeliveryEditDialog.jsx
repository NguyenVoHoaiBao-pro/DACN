import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { LocalShipping as ShipIcon } from "@mui/icons-material";
import { adminUpdateOrderDelivery } from "../../services/orderService";
import { canSalesEditDelivery, salesDeliveryLockReason } from "../../utils/orderDeliveryEdit";
import { usePermissions } from "../../hooks/usePermissions";

const SalesDeliveryEditDialog = ({ open, order, onClose, onSaved }) => {
  const { hasAnyPermission } = usePermissions();
  const isFullAdmin = hasAnyPermission(["USER_MANAGE", "ADMIN", "ROLE_ADMIN"]);
  const [form, setForm] = useState({
    shippingName: "",
    shippingPhone: "",
    shippingAddress: "",
    shippingProvince: "",
    shippingDistrict: "",
    shippingWard: "",
    note: "",
    adminNote: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editable = order && (isFullAdmin || canSalesEditDelivery(order.status));

  useEffect(() => {
    if (!order) return;
    setForm({
      shippingName: order.shippingName || order.customerName || "",
      shippingPhone: order.shippingPhone || "",
      shippingAddress: order.shippingAddress || "",
      shippingProvince: order.shippingProvince || "",
      shippingDistrict: order.shippingDistrict || "",
      shippingWard: order.shippingWard || "",
      note: order.note || "",
      adminNote: order.adminNote || "",
    });
    setError("");
  }, [order, open]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!order?.id || !editable) return;
    setSaving(true);
    setError("");
    try {
      const updated = await adminUpdateOrderDelivery(order.id, form);
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được thông tin giao hàng");
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShipIcon color="primary" />
        Sửa giao hàng — {order.orderCode}
      </DialogTitle>
      <DialogContent dividers>
        {!editable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {salesDeliveryLockReason(order.status)}
          </Alert>
        )}
        {editable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Chỉ sửa tên người nhận, SĐT, địa chỉ và ghi chú — không thay đổi sản phẩm hay tổng tiền.
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Tên người nhận"
            required
            fullWidth
            disabled={!editable}
            value={form.shippingName}
            onChange={handleChange("shippingName")}
          />
          <TextField
            label="Số điện thoại nhận hàng"
            required
            fullWidth
            disabled={!editable}
            value={form.shippingPhone}
            onChange={handleChange("shippingPhone")}
          />
          <TextField
            label="Địa chỉ chi tiết (số nhà, đường...)"
            required
            fullWidth
            multiline
            rows={2}
            disabled={!editable}
            value={form.shippingAddress}
            onChange={handleChange("shippingAddress")}
          />
          <TextField
            label="Phường / Xã"
            fullWidth
            disabled={!editable}
            value={form.shippingWard}
            onChange={handleChange("shippingWard")}
          />
          <TextField
            label="Quận / Huyện"
            fullWidth
            disabled={!editable}
            value={form.shippingDistrict}
            onChange={handleChange("shippingDistrict")}
          />
          <TextField
            label="Tỉnh / Thành phố"
            fullWidth
            disabled={!editable}
            value={form.shippingProvince}
            onChange={handleChange("shippingProvince")}
          />
          <TextField
            label="Ghi chú đơn hàng (cho shipper)"
            fullWidth
            multiline
            rows={2}
            disabled={!editable}
            placeholder='VD: "Giao giờ hành chính", "Gọi trước khi giao 30 phút"'
            value={form.note}
            onChange={handleChange("note")}
          />
          <TextField
            label="Ghi chú nội bộ (admin)"
            fullWidth
            multiline
            rows={2}
            disabled={!editable}
            value={form.adminNote}
            onChange={handleChange("adminNote")}
          />
        </Box>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
        {editable && (
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SalesDeliveryEditDialog;
