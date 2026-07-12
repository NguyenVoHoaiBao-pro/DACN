/**
 * Popup in phiếu giao hàng — Ctrl+P
 */
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";

const ShippingLabelDialog = ({ open, order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Phiếu giao hàng</DialogTitle>
      <DialogContent>
        <Box
          id="shipping-label-print"
          sx={{
            border: "2px dashed #1976d2",
            borderRadius: 2,
            p: 3,
            bgcolor: "#fafafa",
            "@media print": { border: "1px solid #000", bgcolor: "#fff" },
          }}
        >
          <Typography variant="overline" color="text.secondary">
            ELECTRO STORE — Vận đơn
          </Typography>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            {order.orderCode}
          </Typography>
          {order.trackingCode && (
            <Typography
              variant="h6"
              fontFamily="monospace"
              sx={{ letterSpacing: 2, mb: 2 }}
            >
              {order.trackingCode}
            </Typography>
          )}
          <Typography variant="subtitle2" color="text.secondary">
            Người nhận
          </Typography>
          <Typography fontWeight={700}>{order.shippingName}</Typography>
          <Typography>{order.shippingPhone}</Typography>
          <Typography sx={{ mb: 2 }}>
            {order.shippingAddress}
            {order.shippingWard ? `, ${order.shippingWard}` : ""}
            {order.shippingDistrict ? `, ${order.shippingDistrict}` : ""}
            {order.shippingProvince ? `, ${order.shippingProvince}` : ""}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Đơn vị vận chuyển
          </Typography>
          <Typography fontWeight={600} gutterBottom>
            Giao Hàng Nhanh (GHN)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dán nhãn lên thùng hàng · Quét mã vận đơn khi bàn giao shipper
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Đóng</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          In nhãn (Ctrl+P)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShippingLabelDialog;
