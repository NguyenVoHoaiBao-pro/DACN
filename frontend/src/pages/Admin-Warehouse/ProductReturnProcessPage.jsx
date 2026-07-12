/**
 * Màn 2 — Chi tiết đánh giá và hoàn kho (Nhân viên Kho)
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  FormControlLabel, Grid, Paper, Radio, RadioGroup, TextField, Typography,
} from "@mui/material";
import {
  ArrowBack as BackIcon, AssignmentReturn as ReturnIcon,
  CheckCircle as OkIcon, Error as BadIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { fetchProductReturnDetail, processProductReturn } from "../../services/productReturnService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";

const ProductReturnProcessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDefective, setIsDefective] = useState("false");
  const [defectiveReason, setDefectiveReason] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchProductReturnDetail(id);
      if (isApiSuccess(res)) {
        setDetail(res.data);
        if (res.data.isDefective != null) {
          setIsDefective(res.data.isDefective ? "true" : "false");
        }
        setReason(res.data.reason || "");
        setNotes(res.data.warehouseNotes || "");
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được phiếu hoàn."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const canProcess = detail?.status === "PENDING";

  const handleConfirm = async () => {
    if (!canProcess) return;
    if (isDefective === "true" && !defectiveReason) {
      toast.warning("Hàng lỗi — vui lòng chọn lý do: vận chuyển hoặc sản xuất.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await processProductReturn(id, {
        isDefective: isDefective === "true",
        defectiveReason: isDefective === "true" ? defectiveReason : undefined,
        reason: reason.trim(),
        warehouseNotes: notes.trim(),
      });
      if (isApiSuccess(res)) {
        const defective = isDefective === "true";
        toast.success(
          defective
            ? "Đã cách ly hàng lỗi — tồn kho bán không tăng. Yêu cầu hoàn tiền đã gửi Kế toán (nếu có đơn liên kết)."
            : "Đã hoàn kho — Serial AVAILABLE, tồn +1. Yêu cầu hoàn tiền đã gửi Kế toán.",
          { autoClose: 6000 },
        );
        setDetail(res.data);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xác nhận hoàn kho thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout currentPage="Xử lý hàng hoàn">
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout currentPage="Xử lý hàng hoàn">
        <Alert severity="error">Không tìm thấy phiếu hoàn trả.</Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="Xử lý hàng hoàn">
      <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate("/admin/return")} sx={{ mb: 2 }}>
          Danh sách phiếu hoàn
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <ReturnIcon sx={{ color: "#dc2626" }} />
          <Typography variant="h5" fontWeight="bold">{detail.slipCode}</Typography>
          <Chip label={detail.statusLabel}
            color={detail.status === "PENDING" ? "warning" : "success"} />
        </Box>

        {/* Khu vực 1 — Auto-fill */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            1. Thông tin truy vết
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Mã đơn gốc</Typography>
              <Typography fontWeight={600}>{detail.orderCode || "—"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Khách hàng</Typography>
              <Typography fontWeight={600}>
                {detail.customerName || "—"}
                {detail.customerPhone ? ` · ${detail.customerPhone}` : ""}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Sản phẩm</Typography>
              <Typography fontWeight={600}>
                {detail.productName || "—"}
                {detail.variantName ? ` (${detail.variantName})` : ""}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">SKU</Typography>
              <Typography fontWeight={600}>{detail.skuCode || "—"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Serial / IMEI</Typography>
              <Typography fontWeight={700} sx={{ fontFamily: "monospace" }}>
                {detail.serialNumber}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Trạng thái trước hoàn</Typography>
              <Typography fontWeight={600}>{detail.itemStatusBefore || "—"}</Typography>
            </Grid>
            {detail.trackingCode && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Vận đơn</Typography>
                <Typography>{detail.trackingCode}</Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Khu vực 2 — Đánh giá */}
        <Card sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              2. Đánh giá tình trạng hàng hóa
            </Typography>
            <RadioGroup
              value={isDefective}
              onChange={(e) => setIsDefective(e.target.value)}
              sx={{ gap: 2, mb: 2 }}
            >
              <Paper sx={{
                p: 2, border: `2px solid ${isDefective === "false" ? "#16a34a" : "#e2e8f0"}`,
                bgcolor: isDefective === "false" ? "#f0fdf4" : "#fff",
              }}>
                <FormControlLabel
                  value="false"
                  disabled={!canProcess}
                  control={<Radio color="success" />}
                  label={
                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <OkIcon color="success" />
                      <Box>
                        <Typography fontWeight={700}>Hàng còn nguyên vẹn / Chưa khui hộp (Hàng bom)</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Đưa lại kho bán — Serial AVAILABLE, tồn kho website +1.
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, width: "100%" }}
                />
              </Paper>
              <Paper sx={{
                p: 2, border: `2px solid ${isDefective === "true" ? "#dc2626" : "#e2e8f0"}`,
                bgcolor: isDefective === "true" ? "#fef2f2" : "#fff",
              }}>
                <FormControlLabel
                  value="true"
                  disabled={!canProcess}
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <BadIcon color="error" />
                      <Box>
                        <Typography fontWeight={700}>Hàng đã khui / Lỗi kỹ thuật / Hư hỏng</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cách ly DEFECTIVE — không tăng tồn kho bán. Sales xử lý đổi/trả qua ticket BH nếu cần.
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, width: "100%" }}
                />
              </Paper>
            </RadioGroup>

            {isDefective === "true" && canProcess && (
              <Box sx={{ mb: 2, pl: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Lý do hàng lỗi (bắt buộc)
                </Typography>
                <RadioGroup
                  value={defectiveReason}
                  onChange={(e) => setDefectiveReason(e.target.value)}
                >
                  <FormControlLabel
                    value="DEFECTIVE_BY_CARRIER"
                    control={<Radio color="error" />}
                    label="Hãng vận chuyển làm vỡ / hư hỏng"
                  />
                  <FormControlLabel
                    value="DEFECTIVE_BY_MANUFACTURER"
                    control={<Radio color="error" />}
                    label="Lỗi sản xuất / lỗi kỹ thuật từ nhà máy"
                  />
                </RadioGroup>
              </Box>
            )}

            <TextField
              fullWidth multiline minRows={2} label="Mô tả / lý do chi tiết"
              placeholder="VD: Củ sạc sập nguồn, vỏ ngoài không trầy..."
              value={reason} onChange={(e) => setReason(e.target.value)}
              disabled={!canProcess} sx={{ mb: 2 }}
            />
            <TextField
              fullWidth multiline minRows={2} label="Ghi chú kho (tùy chọn)"
              value={notes} onChange={(e) => setNotes(e.target.value)}
              disabled={!canProcess}
            />
          </CardContent>
        </Card>

        {/* Khu vực 3 — Xác nhận */}
        {canProcess ? (
          <Button
            variant="contained" color="success" size="large" fullWidth
            disabled={submitting}
            onClick={handleConfirm}
            sx={{ py: 1.5, fontWeight: 700, fontSize: "1.05rem" }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : "Xác nhận hoàn kho"}
          </Button>
        ) : (
          <Alert severity={detail.isDefective ? "warning" : "success"}>
            Phiếu đã xử lý
            {detail.processedAt && ` lúc ${new Date(detail.processedAt).toLocaleString("vi-VN")}`}.
            {detail.isDefective
              ? " Hàng đã chuyển DEFECTIVE."
              : " Hàng đã hoàn lại kho bán (AVAILABLE)."}
          </Alert>
        )}
      </Box>
    </AdminLayout>
  );
};

export default ProductReturnProcessPage;
