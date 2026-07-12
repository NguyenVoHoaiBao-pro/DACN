/**
 * Phiếu chi kế toán điện tử — in / PDF
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Divider, Paper, Typography } from "@mui/material";
import { ArrowBack as BackIcon, Print as PrintIcon } from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { API_BASE_URL } from "../../config/api";
import { fetchRefundVoucher } from "../../services/refundService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";

const formatMoney = (v) => (v != null ? `${Number(v).toLocaleString("vi-VN")} VND` : "—");
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");

const RefundVoucherPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchRefundVoucher(id);
        if (isApiSuccess(res)) setVoucher(res.data);
      } catch (e) {
        setError(getApiErrorMessage(e, "Không tải được phiếu chi."));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <AdminLayout currentPage="Quản lý hoàn tiền">
        <Box sx={{ textAlign: "center", py: 10 }}><CircularProgress /></Box>
      </AdminLayout>
    );
  }

  if (error || !voucher) {
    return (
      <AdminLayout currentPage="Quản lý hoàn tiền">
        <Alert severity="error" sx={{ m: 3 }}>{error || "Không có phiếu chi."}</Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="Quản lý hoàn tiền">
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }} className="refund-voucher-page">
        <Box sx={{ mb: 2, display: "flex", gap: 1, "@media print": { display: "none" } }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate(`/admin/refunds/${id}`)}>
            Quay lại
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            In / Lưu PDF
          </Button>
        </Box>

        <Paper sx={{ p: 4, borderRadius: 2, border: "2px solid #1e293b" }} id="voucher-print">
          <Typography variant="h4" align="center" fontWeight="bold" letterSpacing={4} gutterBottom>
            PHIẾU CHI
          </Typography>
          <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>
            (Hệ thống Electro Store tự tạo)
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography><strong>Mã phiếu chi:</strong> {voucher.voucherCode}</Typography>
            <Typography><strong>Ngày chi:</strong> {formatDate(voucher.issuedAt)}</Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ lineHeight: 2.2 }}>
            <Typography><strong>Người nhận:</strong> {voucher.recipientName || "—"}</Typography>
            {voucher.recipientBank && (
              <Typography><strong>Ngân hàng:</strong> {voucher.recipientBank} — {voucher.recipientAccount}</Typography>
            )}
            <Typography><strong>Lý do chi:</strong> {voucher.reason}</Typography>
            <Typography><strong>Đơn hàng:</strong> {voucher.orderCode}</Typography>
            {voucher.returnSlipCode && (
              <Typography><strong>Phiếu kho:</strong> {voucher.returnSlipCode}</Typography>
            )}
            <Typography><strong>Mã hoàn tiền:</strong> {voucher.refundCode}</Typography>
            <Typography><strong>Phương thức gốc:</strong> {voucher.paymentMethodLabel}</Typography>
            {voucher.gatewayTransactionId && (
              <Typography><strong>Mã GD hoàn:</strong> {voucher.gatewayTransactionId}</Typography>
            )}
            <Typography variant="h5" sx={{ mt: 2, color: "#dc2626" }}>
              <strong>Số tiền: {formatMoney(voucher.amount)}</strong>
            </Typography>
          </Box>

          {voucher.receiptImageUrl && (
            <Box sx={{ mt: 3 }}>
              <Typography fontWeight={600} gutterBottom>Chứng từ đính kèm:</Typography>
              <Box component="img"
                src={`${API_BASE_URL}${voucher.receiptImageUrl}`}
                alt="Biên lai"
                sx={{ maxWidth: 300, border: "1px solid #ccc", borderRadius: 1 }} />
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Box sx={{ textAlign: "center", width: "45%" }}>
              <Typography>Người lập phiếu</Typography>
              <Typography variant="body2" color="text.secondary">(Kế toán)</Typography>
              <Typography sx={{ mt: 6, fontWeight: 600 }}>{voucher.approvedBy || "—"}</Typography>
            </Box>
            <Box sx={{ textAlign: "center", width: "45%" }}>
              <Typography>Giám đốc</Typography>
              <Typography variant="body2" color="text.secondary">(Ký, ghi rõ họ tên)</Typography>
              <Typography sx={{ mt: 6 }}>........................</Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default RefundVoucherPage;
