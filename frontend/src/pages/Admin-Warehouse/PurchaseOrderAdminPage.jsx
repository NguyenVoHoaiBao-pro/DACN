/**
 * Giai đoạn 0 — Admin: Duyệt chứng từ PO (PENDING → IN_TRANSIT → Kho)
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { Check as ApproveIcon, Close as RejectIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  approvePurchaseOrder, fetchPendingPoList, rejectPurchaseOrder,
} from "../../services/purchaseOrderService";
import { isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const STATUS_COLOR = {
  PENDING: "warning",
  IN_TRANSIT: "primary",
  APPROVED: "info",
};

const PurchaseOrderAdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPendingPoList();
      if (isApiSuccess(res)) setRows(res.data || []);
    } catch {
      toast.error("Không tải được danh sách PO chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (po) => {
    setActing(true);
    try {
      const res = await approvePurchaseOrder(po.id, {});
      if (isApiSuccess(res)) {
        toast.success(
          `Đã phê duyệt ${po.poNumber}. PO chuyển Đang vận chuyển — Nhân viên Kho sẽ nhận thông báo.`,
        );
        load();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Duyệt thất bại.");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActing(true);
    try {
      const res = await rejectPurchaseOrder(rejectId, { reason: rejectReason });
      if (isApiSuccess(res)) {
        toast.success("Đã từ chối PO.");
        setRejectOpen(false);
        setRejectReason("");
        load();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Từ chối thất bại.");
    } finally {
      setActing(false);
    }
  };

  return (
    <AdminLayout currentPage="Duyệt chứng từ">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
            Duyệt chứng từ — Đơn mua hàng
          </Typography>
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Kiểm tra số tiền và số lượng từ bộ phận Thu mua. Bấm{" "}
          <strong>Phê duyệt đơn hàng</strong> → PO chuyển{" "}
          <Chip label="Đang vận chuyển / Chờ nhập kho" color="primary" size="small" sx={{ verticalAlign: "middle" }} />
          {" "}và tự động xuất hiện trên Dashboard Nhân viên Kho.
        </Alert>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Mã PO</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nhà cung cấp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tổng SL</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hẹn giao kho</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((po) => (
                  <TableRow key={po.id} hover sx={{ bgcolor: "#fffde7" }}>
                    <TableCell><strong>{po.poNumber}</strong></TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell>
                      <Chip label={po.statusLabel || "Chờ duyệt"} color={STATUS_COLOR[po.status] || "warning"} size="small" />
                    </TableCell>
                    <TableCell>{po.totalQuantityOrdered}</TableCell>
                    <TableCell>
                      {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("vi-VN") : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        disabled={acting}
                        onClick={() => handleApprove(po)}
                        sx={{ mr: 1, fontWeight: 700 }}
                      >
                        Phê duyệt đơn hàng
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<RejectIcon />}
                        disabled={acting}
                        onClick={() => { setRejectId(po.id); setRejectOpen(true); }}
                      >
                        Từ chối
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Không có đơn PO chờ duyệt.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối đơn mua hàng</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} label="Lý do từ chối" value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={acting}>Xác nhận</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default PurchaseOrderAdminPage;
