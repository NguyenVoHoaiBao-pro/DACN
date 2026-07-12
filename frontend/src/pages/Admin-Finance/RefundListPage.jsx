/**
 * Màn 1 — Danh sách yêu cầu hoàn tiền (/admin/refunds)
 * Sales: xem + nhập STK | Admin: duyệt chi tiền
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from "@mui/material";
import { Payments as RefundIcon, Refresh as RefreshIcon, Download as DownloadIcon } from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  fetchRefunds, paymentMethodChipColor, paymentMethodTag,
} from "../../services/refundService";
import { usePermissions } from "../../hooks/usePermissions";
import { isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const STATUS_COLOR = {
  PENDING_APPROVAL: "warning",
  AWAITING_MANUAL_TRANSFER: "info",
  PROCESSING: "info",
  COMPLETED: "success",
  REJECTED: "default",
  FAILED: "error",
};

const formatMoney = (v) => (v != null ? `${Number(v).toLocaleString("vi-VN")} ₫` : "—");

const exportCsv = (rows) => {
  const header = ["Mã RF", "Mã RT", "Đơn hàng", "Khách", "Số tiền", "PTTT", "Trạng thái", "Phiếu chi", "Hoàn lúc"];
  const lines = rows.map((r) => [
    r.refundCode,
    r.returnSlipCode || "",
    r.orderCode || "",
    r.customerName || "",
    r.refundAmount,
    r.paymentMethod,
    r.statusLabel,
    r.voucherCode || "",
    r.completedAt ? new Date(r.completedAt).toLocaleString("vi-VN") : "",
  ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lich-su-hoan-tien-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const RefundListPage = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdminUser } = usePermissions();
  const canApprove = hasPermission("REFUND_APPROVE") || isAdminUser;
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [paymentFilter, setPaymentFilter] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRefunds(statusFilter || null, paymentFilter || null);
      if (isApiSuccess(res)) setRefunds(res.data || []);
    } catch {
      toast.error("Không tải được danh sách hoàn tiền.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  const pendingCount = useMemo(
    () => refunds.filter((r) => r.status === "PENDING_APPROVAL").length,
    [refunds],
  );

  const isHistoryView = statusFilter === "COMPLETED";

  return (
    <AdminLayout currentPage="Quản lý hoàn tiền">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <RefundIcon sx={{ color: "#dc2626", fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">Quản lý hoàn tiền</Typography>
          <IconButton onClick={loadList} size="small"><RefreshIcon /></IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Sau khi Kho xác nhận hoàn kho (RT-...), yêu cầu tự chuyển sang đây.
          {canApprove
            ? " Admin duyệt chi tiền (VNPay / COD)."
            : " Sales nhập STK khách cho đơn COD — Admin sẽ duyệt chuyển khoản."}
          {pendingCount > 0 && ` · ${pendingCount} chờ xử lý`}
        </Typography>
        {isHistoryView && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Lịch sử chi trả</strong> — các phiếu hoàn đã hoàn tất. Xuất CSV để đối soát cuối tháng.
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select label="Trạng thái" value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="PENDING">Chờ duyệt</MenuItem>
              <MenuItem value="COMPLETED">Lịch sử đã hoàn</MenuItem>
              <MenuItem value="REJECTED">Đã từ chối</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Phương thức gốc</InputLabel>
            <Select label="Phương thức gốc" value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="VNPAY">VNPay</MenuItem>
              <MenuItem value="MOMO">MoMo</MenuItem>
              <MenuItem value="ZALOPAY">ZaloPay</MenuItem>
              <MenuItem value="COD">Tiền mặt / COD</MenuItem>
            </Select>
          </FormControl>
          {isHistoryView && refunds.length > 0 && (
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
              onClick={() => exportCsv(refunds)}>
              Xuất CSV
            </Button>
          )}
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          {loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress /></Box>
          ) : refunds.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>Không có yêu cầu hoàn tiền phù hợp bộ lọc.</Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell><strong>Mã RF / ORD</strong></TableCell>
                  <TableCell><strong>Mã RT / BH</strong></TableCell>
                  <TableCell><strong>Phân loại kho</strong></TableCell>
                  <TableCell><strong>Khách hàng</strong></TableCell>
                  <TableCell align="right"><strong>Số tiền hoàn</strong></TableCell>
                  <TableCell><strong>Phương thức</strong></TableCell>
                  <TableCell><strong>Trạng thái</strong></TableCell>
                  <TableCell align="center"><strong>Hành động</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {refunds.map((r) => {
                  const isCod = r.paymentMethod === "COD" || r.paymentMethod === "BANK_TRANSFER";
                  const actionLabel = r.status === "COMPLETED"
                    ? "Xem chi tiết"
                    : canApprove
                      ? "Duyệt hoàn tiền"
                      : isCod
                        ? "Nhập STK khách"
                        : "Xem chi tiết";
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {r.refundCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{r.orderCode}</Typography>
                      </TableCell>
                      <TableCell>{r.returnSlipCode || r.warrantyClaimCode || "—"}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {r.defectiveReasonLabel || (r.isDefective ? "Hàng lỗi" : "Hàng tốt")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{r.customerName || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.orderCode}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#dc2626" }}>
                        {formatMoney(r.refundAmount)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={paymentMethodTag(r.paymentMethod)}
                          color={paymentMethodChipColor(r.paymentMethod)} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={r.statusLabel}
                          color={STATUS_COLOR[r.status] || "default"} />
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="contained"
                          onClick={() => navigate(`/admin/refunds/${r.id}`)}>
                          {actionLabel}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Box>
    </AdminLayout>
  );
};

export default RefundListPage;
