/**
 * Sales — Duyệt yêu cầu trả hàng từ khách (RR)
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import {
  AssignmentReturn as ReturnIcon, Refresh as RefreshIcon, Visibility as ViewIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  RETURN_STATUS_COLOR,
  approveReturnRequest,
  fetchAdminReturnRequestDetail,
  fetchAdminReturnRequests,
  rejectReturnRequest,
} from "../../services/customerReturnRequestService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";

const TABS = [
  { label: "Chờ duyệt", value: "PENDING_SALES_REVIEW" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Khách đã gửi", value: "SHIPPED_BY_CUSTOMER" },
  { label: "Từ chối", value: "REJECTED" },
  { label: "Tất cả", value: "" },
];

const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

const CustomerReturnRequestListPage = () => {
  const [tab, setTab] = useState("PENDING_SALES_REVIEW");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [salesNote, setSalesNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminReturnRequests(tab || undefined);
      if (isApiSuccess(res)) setRows(res.data || []);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được danh sách."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSalesNote("");
    setRejectReason("");
    try {
      const res = await fetchAdminReturnRequestDetail(id);
      if (isApiSuccess(res)) setDetail(res.data);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải chi tiết."));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!detail?.id) return;
    setActionLoading(true);
    try {
      const res = await approveReturnRequest(detail.id, salesNote.trim());
      if (isApiSuccess(res)) {
        toast.success("Đã duyệt — khách có 7 ngày gửi hàng về.");
        setDetail(res.data);
        load();
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Duyệt thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!detail?.id || !rejectReason.trim()) {
      toast.warning("Vui lòng nhập lý do từ chối.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await rejectReturnRequest(detail.id, rejectReason.trim(), salesNote.trim());
      if (isApiSuccess(res)) {
        toast.success("Đã từ chối yêu cầu trả hàng.");
        setDetail(res.data);
        load();
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Từ chối thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

  const canReview = detail?.status === "PENDING_SALES_REVIEW";

  return (
    <AdminLayout currentPage="Yêu cầu trả hàng">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <ReturnIcon sx={{ fontSize: 34, color: "#dc2626" }} />
          <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
            Yêu cầu trả hàng khách (RR)
          </Typography>
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Sales duyệt yêu cầu trả hàng trước khi khách gửi hàng về. Sau khi kho nhận &amp; QC (RT), hệ thống tạo RF — Admin duyệt hoàn tiền.
        </Alert>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          {TABS.map((t) => (
            <Tab key={t.value || "ALL"} label={t.label} value={t.value} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fef2f2" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Mã RR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Đơn hàng</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Serial</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lý do</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell><strong>{r.requestCode}</strong></TableCell>
                    <TableCell>{r.orderCode}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{r.serialNumber}</TableCell>
                    <TableCell>{r.productName || "—"}</TableCell>
                    <TableCell>{r.reasonTypeLabel}</TableCell>
                    <TableCell>{fmt(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.statusLabel}
                        color={RETURN_STATUS_COLOR[r.status] || "default"} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<ViewIcon />}
                        onClick={() => openDetail(r.id)}>
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      Không có yêu cầu nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle component="div">
          <Typography component="span" variant="h6" fontWeight={700}>
            {detail?.requestCode || "Chi tiết yêu cầu trả hàng"}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : detail ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Chip label={detail.statusLabel} sx={{ alignSelf: "flex-start" }} />
              <Typography variant="body2"><strong>Đơn:</strong> {detail.orderCode}</Typography>
              <Typography variant="body2"><strong>Khách:</strong> {detail.customerName} · {detail.customerPhone}</Typography>
              <Typography variant="body2"><strong>Sản phẩm:</strong> {detail.productName}</Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                <strong>Serial:</strong> {detail.serialNumber}
              </Typography>
              <Typography variant="body2">
                <strong>Lý do:</strong> {detail.reasonTypeLabel}
                {detail.reasonDetail ? ` — ${detail.reasonDetail}` : ""}
              </Typography>
              {detail.shipDeadline && (
                <Typography variant="body2">
                  <strong>Hạn gửi hàng:</strong> {fmt(detail.shipDeadline)}
                </Typography>
              )}
              {canReview && (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ghi chú phản hồi cho khách (tuỳ chọn)"
                    value={salesNote}
                    onChange={(e) => setSalesNote(e.target.value)}
                    sx={{ mt: 1 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Lý do từ chối (nếu từ chối)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    multiline
                    minRows={2}
                  />
                </>
              )}
              {detail.rejectionReason && (
                <Alert severity="error">Từ chối: {detail.rejectionReason}</Alert>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
          {canReview && (
            <>
              <Button color="error" onClick={handleReject} disabled={actionLoading}>
                Từ chối
              </Button>
              <Button variant="contained" color="success" onClick={handleApprove} disabled={actionLoading}>
                Duyệt trả hàng
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default CustomerReturnRequestListPage;
