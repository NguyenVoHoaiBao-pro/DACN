/**
 * Màn hình 2–4 — Kiểm đếm PO, xác nhận sai lệch, kết quả nhập kho
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  QrCode2 as ImeiIcon,
  Inventory as CountIcon,
  CloudUpload as UploadIcon,
  Done as DoneIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { selectUser } from "../../redux/appSlice";
import {
  fetchPoDetail,
  previewPoReceive,
  confirmPoReceive,
} from "../../services/purchaseOrderService";
import { isApiSuccess, getApiErrorMessage } from "../../utils/apiResponse";
import { getStoredUserId } from "../../utils/authSession";

const emptyCounts = (items = []) =>
  items.reduce((acc, item) => {
    acc[item.id] = { received: "", damaged: "" };
    return acc;
  }, {});

const PurchaseOrderReceivePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const [detail, setDetail] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [evidenceBase64, setEvidenceBase64] = useState(null);

  const [completed, setCompleted] = useState(searchParams.get("done") === "1");
  const [lastLot, setLastLot] = useState(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPoDetail(id);
      if (isApiSuccess(res)) {
        const data = res.data;
        setDetail(data);
        if (data.status === "RECEIVED") {
          setCompleted(true);
        } else {
          setCounts(emptyCounts(data.items));
        }
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không tải được chi tiết PO."));
      navigate("/admin/purchase-orders");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const setCount = (itemId, field, value) => {
    const num = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: num },
    }));
  };

  const adjustCount = (itemId, field, delta) => {
    setCounts((prev) => {
      const current = prev[itemId]?.[field];
      const base = current === "" || current === undefined ? 0 : current;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], [field]: Math.max(0, base + delta) },
      };
    });
  };

  const buildPayload = () => ({
    items: (detail?.items || []).map((item) => ({
      itemId: item.id,
      quantityReceived: Number(counts[item.id]?.received) || 0,
      quantityDamaged: Number(counts[item.id]?.damaged) || 0,
    })),
    discrepancyReason: discrepancyReason.trim() || null,
    discrepancyEvidence: evidenceBase64,
    receivedByUserId: user?.id ?? user?.userId ?? getStoredUserId(),
  });

  const allFilled = useMemo(() => {
    if (!detail?.items?.length) return false;
    return detail.items.every((item) => {
      const c = counts[item.id];
      return c && c.received !== "" && c.received !== undefined;
    });
  }, [detail, counts]);

  const handleFinishCounting = async () => {
    if (!allFilled) {
      toast.warning("Vui lòng nhập số lượng thực nhận cho tất cả dòng sản phẩm.");
      return;
    }
    for (const item of detail.items) {
      const damaged = Number(counts[item.id]?.damaged) || 0;
      const received = Number(counts[item.id]?.received) || 0;
      if (damaged > received) {
        toast.error(`Số lượng lỗi không được lớn hơn thực nhận (${item.productName}).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await previewPoReceive(id, buildPayload());
      if (isApiSuccess(res)) {
        setPreview(res.data);
        setConfirmOpen(true);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể kiểm tra sai lệch."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidenceChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.warning("Vui lòng chọn file ảnh (JPG, PNG...).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceBase64(reader.result);
      setEvidencePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmReceive = async () => {
    if (preview?.hasDiscrepancy && !discrepancyReason.trim()) {
      toast.warning("Vui lòng nhập lý do sai lệch.");
      return;
    }
    if (!buildPayload().receivedByUserId) {
      toast.error("Không xác định được tài khoản nhân viên. Vui lòng đăng xuất và đăng nhập lại.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await confirmPoReceive(id, buildPayload());
      if (isApiSuccess(res)) {
        setConfirmOpen(false);
        setCompleted(true);
        setLastLot(res.data);
        setDetail((d) => (d ? { ...d, status: "RECEIVED", statusLabel: "Đã nhập kho" } : d));
        toast.success(
          `Nhập kho thành công — Mã lô: ${res.data?.lotNumber || "—"}`,
        );
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Xác nhận nhập kho thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout currentPage="Kiểm đếm PO">
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress sx={{ color: "#ff9f1a" }} />
        </Box>
      </AdminLayout>
    );
  }

  if (!detail) return null;

  // ─── Màn hình 4: Kết quả thành công ─────────────────────────────────────
  if (completed) {
    return (
      <AdminLayout currentPage="Nhập kho thành công">
        <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
          <Card sx={{ borderRadius: 4, textAlign: "center", p: 4, border: "2px solid #81c784" }}>
            <SuccessIcon sx={{ fontSize: 72, color: "#4caf50", mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom color="success.main">
              Nhập kho thành công!
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Đơn hàng <strong>{detail.poNumber}</strong> đã chuyển sang trạng thái{" "}
              <Chip label="Đã nhập kho" color="success" size="small" sx={{ fontWeight: 700 }} />
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Nhà cung cấp: {detail.supplierName} · Ngày hẹn:{" "}
              {detail.expectedDate ? new Date(detail.expectedDate).toLocaleDateString("vi-VN") : "—"}
            </Typography>
            {lastLot?.lotNumber && (
              <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 3 }}>
                Mã lô hàng: {lastLot.lotNumber} (đợt {lastLot.receiveWave})
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<ImeiIcon />}
                onClick={() => {
                  const q = new URLSearchParams({
                    poId: String(detail.id),
                    poNumber: detail.poNumber,
                  });
                  if (lastLot?.stockLotId) q.set("lotId", String(lastLot.stockLotId));
                  if (lastLot?.lotNumber) q.set("lotNumber", lastLot.lotNumber);
                  navigate(`/admin/imei?${q.toString()}`);
                }}
                sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, fontWeight: 700, px: 4 }}
              >
                Chuyển sang quét mã Serial
              </Button>
              <Button variant="outlined" onClick={() => navigate("/admin/purchase-orders")}>
                Về danh sách PO
              </Button>
            </Box>
          </Card>
        </Box>
      </AdminLayout>
    );
  }

  // ─── Màn hình 2: Kiểm đếm ───────────────────────────────────────────────
  return (
    <AdminLayout currentPage="Kiểm đếm hàng hóa">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <IconButton onClick={() => navigate("/admin/purchase-orders")}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Kiểm đếm — {detail.poNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {detail.supplierName} · Hẹn giao:{" "}
              {detail.expectedDate ? new Date(detail.expectedDate).toLocaleDateString("vi-VN") : "—"}
            </Typography>
          </Box>
          <Chip label={detail.statusLabel} color="primary" sx={{ ml: "auto", fontWeight: 700 }} />
        </Box>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Đếm hàng thực tế ngoài kho, nhập <strong>Số lượng thực nhận</strong> (tổng đếm được) và{" "}
          <strong>Số lượng lỗi/hỏng</strong> (nếu có). Cột đặt mua bị khóa theo hệ thống.
        </Alert>

        <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: "#fafafa" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">SL đặt mua</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "#e8f5e9" }} align="center">
                  SL thực nhận
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "#ffebee" }} align="center">
                  SL lỗi/hỏng
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{item.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.variantName} · SKU: {item.skuCode}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      value={item.quantityOrdered}
                      size="small"
                      disabled
                      sx={{ width: 90, "& .MuiInputBase-input": { textAlign: "center", fontWeight: 700 } }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f9fdf9" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => adjustCount(item.id, "received", -1)}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        value={counts[item.id]?.received ?? ""}
                        onChange={(e) => setCount(item.id, "received", e.target.value)}
                        size="small"
                        placeholder="0"
                        inputProps={{ min: 0, style: { textAlign: "center" } }}
                        sx={{ width: 72 }}
                      />
                      <IconButton size="small" onClick={() => adjustCount(item.id, "received", 1)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#fff8f8" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => adjustCount(item.id, "damaged", -1)}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        value={counts[item.id]?.damaged ?? ""}
                        onChange={(e) => setCount(item.id, "damaged", e.target.value)}
                        size="small"
                        placeholder="0"
                        inputProps={{ min: 0, style: { textAlign: "center" } }}
                        sx={{ width: 72 }}
                      />
                      <IconButton size="small" onClick={() => adjustCount(item.id, "damaged", 1)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            size="large"
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CountIcon />}
            disabled={submitting || !allFilled}
            onClick={handleFinishCounting}
            sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, fontWeight: 700, px: 4 }}
          >
            Hoàn thành kiểm đếm
          </Button>
        </Box>
      </Box>

      {/* ─── Màn hình 3: Pop-up xác nhận ─────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        {preview?.exactMatch ? (
          <>
            <DialogTitle sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SuccessIcon /> Số lượng trùng khớp hoàn toàn
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Typography>
                Tổng <strong>{preview.totalOrdered}</strong> sản phẩm khớp với đơn đặt mua, không có hàng lỗi.
                Bạn có chắc chắn muốn nhập kho không?
              </Typography>
            </DialogContent>
          </>
        ) : (
          <>
            <DialogTitle sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <WarningIcon /> Phát hiện sai lệch số lượng
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {preview?.shortage > 0 && (
                  <Typography variant="body2">
                    <strong>Thiếu {preview.shortage} cái</strong>
                  </Typography>
                )}
                {preview?.surplus > 0 && (
                  <Typography variant="body2">
                    <strong>Thừa {preview.surplus} cái</strong>
                  </Typography>
                )}
                {preview?.totalDamaged > 0 && (
                  <Typography variant="body2">
                    <strong>Lỗi/hỏng {preview.totalDamaged} cái</strong>
                  </Typography>
                )}
              </Alert>

              {preview?.items?.filter((i) => i.shortage || i.surplus || i.quantityDamaged).map((row) => (
                <Typography key={row.itemId} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • {row.productName}: đặt {row.quantityOrdered}, nhận {row.quantityReceived}
                  {row.quantityDamaged > 0 ? ` (lỗi ${row.quantityDamaged})` : ""}
                  {row.shortage > 0 ? ` — thiếu ${row.shortage}` : ""}
                  {row.surplus > 0 ? ` — thừa ${row.surplus}` : ""}
                </Typography>
              ))}

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Lý do sai lệch"
                placeholder="VD: Thiếu 5 cái do vỡ trong quá trình vận chuyển..."
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button variant="outlined" component="label" startIcon={<UploadIcon />} fullWidth>
                Tải ảnh minh chứng
                <input type="file" hidden accept="image/*" capture="environment" onChange={handleEvidenceChange} />
              </Button>
              {evidencePreview && (
                <Box
                  component="img"
                  src={evidencePreview}
                  alt="Minh chứng"
                  sx={{ mt: 2, maxHeight: 160, borderRadius: 2, border: "1px solid #eee", width: "100%", objectFit: "contain" }}
                />
              )}
            </DialogContent>
          </>
        )}

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color={preview?.exactMatch ? "success" : "warning"}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <DoneIcon />}
            disabled={submitting}
            onClick={handleConfirmReceive}
          >
            Xác nhận nhập kho
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default PurchaseOrderReceivePage;
