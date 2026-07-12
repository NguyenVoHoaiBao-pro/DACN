/**
 * Admin — Duyệt phiếu kiểm kê / phê duyệt điều chỉnh tồn kho
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import {
  CheckCircle as ApproveIcon, Cancel as RejectIcon, FactCheck as AuditIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  approveInventoryAudit, fetchInventoryAuditDetail, fetchInventoryAudits, rejectInventoryAudit,
} from "../../services/inventoryAuditService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const STATUS_COLOR = {
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const variantLabel = (v) => {
  const name = v.productName || v.skuCode || "Sản phẩm";
  return v.variantName ? `${name} (${v.variantName})` : name;
};

const matchRowSx = (status) => {
  if (status === "MATCH") return { bgcolor: "#f0fdf4" };
  if (status === "SHORTAGE") return { bgcolor: "#fef2f2" };
  if (status === "SURPLUS") return { bgcolor: "#fff7ed" };
  return {};
};

const InventoryAuditApprovalPage = () => {
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryAudits();
      if (isApiSuccess(res)) setAudits(res.data || []);
    } catch {
      toast.error("Không tải được danh sách phiếu kiểm kê.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await fetchInventoryAuditDetail(id);
      if (isApiSuccess(res)) setDetail(res.data);
    } catch {
      toast.error("Không tải được chi tiết phiếu.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const pendingAudits = useMemo(
    () => audits.filter((a) => a.status === "PENDING_APPROVAL"),
    [audits],
  );

  const processedAudits = useMemo(
    () => audits.filter((a) => ["APPROVED", "REJECTED"].includes(a.status)),
    [audits],
  );

  useEffect(() => {
    if (pendingAudits.length > 0 && !selectedId) {
      setSelectedId(pendingAudits[0].id);
    }
  }, [pendingAudits, selectedId]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleApprove = async () => {
    if (!detail) return;
    setActing(true);
    try {
      const res = await approveInventoryAudit(detail.id);
      if (isApiSuccess(res)) {
        toast.success("Đã duyệt — tồn kho website đã cập nhật.");
        setDetail(res.data);
        await loadList();
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Duyệt thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    setActing(true);
    try {
      const res = await rejectInventoryAudit(detail.id, rejectNote.trim() || "Admin từ chối điều chỉnh");
      if (isApiSuccess(res)) {
        toast.info("Đã từ chối phiếu kiểm kê.");
        setDetail(res.data);
        setRejectOpen(false);
        setRejectNote("");
        await loadList();
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Từ chối thất bại."));
    } finally {
      setActing(false);
    }
  };

  const canAct = detail?.status === "PENDING_APPROVAL";

  const renderAuditList = (items, emptyText) => (
    <>
      {items.length === 0 && (
        <Alert severity="info" sx={{ m: 1 }}>{emptyText}</Alert>
      )}
      {items.map((a) => (
        <Button
          key={a.id}
          fullWidth
          variant={selectedId === a.id ? "contained" : "outlined"}
          size="small"
          onClick={() => setSelectedId(a.id)}
          sx={{ mb: 1, justifyContent: "space-between", textTransform: "none" }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="body2" fontWeight={700}>{a.auditCode}</Typography>
            <Typography variant="caption" color="text.secondary">{a.productTypeName || "—"}</Typography>
          </Box>
          <Chip label={a.statusLabel} size="small" color={STATUS_COLOR[a.status] || "default"} />
        </Button>
      ))}
    </>
  );

  return (
    <AdminLayout currentPage="Duyệt phiếu kiểm kê">
      <Box sx={{ p: 3, maxWidth: 1280, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <AuditIcon sx={{ fontSize: 32, color: "#16a34a" }} />
          <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
            Duyệt phiếu kiểm kê — Phê duyệt điều chỉnh tồn kho
          </Typography>
          <IconButton onClick={loadList}><RefreshIcon /></IconButton>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Nhân viên kho gửi báo cáo chênh lệch từ mục <strong>Kiểm kê kho</strong>.
          Admin xem đối chiếu tại đây và <strong>Duyệt</strong> hoặc <strong>Từ chối</strong> điều chỉnh tồn kho.
        </Alert>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                <Typography fontWeight={700} gutterBottom>
                  Chờ duyệt ({pendingAudits.length})
                </Typography>
                {renderAuditList(pendingAudits, "Không có phiếu chờ duyệt.")}
              </Paper>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography fontWeight={700} gutterBottom color="text.secondary">
                  Đã xử lý gần đây
                </Typography>
                {renderAuditList(processedAudits.slice(0, 10), "Chưa có phiếu đã duyệt/từ chối.")}
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              {!selectedId ? (
                <Alert severity="info">Chọn phiếu kiểm kê để xem báo cáo.</Alert>
              ) : detailLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : detail ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Chip label={detail.auditCode} color="primary" />
                    <Chip label={detail.statusLabel} color={STATUS_COLOR[detail.status] || "default"} />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {detail.productTypeName}
                    </Typography>
                  </Box>

                  {detail.notes && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Ghi chú kho: {detail.notes}
                    </Alert>
                  )}

                  <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>SL hệ thống</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>SL thực tế</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Chênh lệch</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(detail.variants || []).map((v) => (
                          <TableRow key={v.variantId || v.id} sx={matchRowSx(v.matchStatus)}>
                            <TableCell>{variantLabel(v)}</TableCell>
                            <TableCell align="center">{v.systemQty}</TableCell>
                            <TableCell align="center">{v.actualQty}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700,
                              color: v.variance < 0 ? "#dc2626" : v.variance > 0 ? "#ea580c" : "#16a34a" }}>
                              {v.variance > 0 ? `+${v.variance}` : v.variance}
                            </TableCell>
                            <TableCell>
                              {v.matchStatus === "MATCH" && <Chip size="small" color="success" label="Khớp 100%" />}
                              {v.matchStatus === "SHORTAGE" && (
                                <Chip size="small" color="error" label={`Thiếu ${Math.abs(v.variance)}`} />
                              )}
                              {v.matchStatus === "SURPLUS" && (
                                <Chip size="small" color="warning" label={`Thừa ${v.variance}`} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {(detail.variants || []).some((v) => v.missingSerials?.length > 0) && (
                    <Paper sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: "#fef2f2" }}>
                      <Typography fontWeight={700} color="error" gutterBottom>
                        Serial hệ thống có nhưng không quét ra
                      </Typography>
                      {(detail.variants || []).filter((v) => v.missingSerials?.length).map((v) => (
                        <Box key={v.variantId} sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{variantLabel(v)}</Typography>
                          <Typography variant="caption" component="div" sx={{ fontFamily: "monospace" }}>
                            {(v.missingSerials || []).join(", ")}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}

                  {detail.discrepancies?.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography fontWeight={700} gutterBottom>Chi tiết mã lệch</Typography>
                      <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: 240, mb: 3 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Serial</TableCell>
                              <TableCell>Loại</TableCell>
                              <TableCell>Sản phẩm</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {detail.discrepancies.map((l) => (
                              <TableRow key={l.id || l.serialNumber}>
                                <TableCell sx={{ fontFamily: "monospace" }}>{l.serialNumber}</TableCell>
                                <TableCell>
                                  <Chip size="small"
                                    label={l.scanResult === "MISSING" ? "Thiếu" : "Thừa/Lệch"}
                                    color={l.scanResult === "MISSING" ? "warning" : "error"} />
                                </TableCell>
                                <TableCell>{l.productName || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {canAct && (
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button variant="contained" color="success" size="large"
                        startIcon={<ApproveIcon />} onClick={handleApprove} disabled={acting}>
                        Duyệt điều chỉnh tồn kho
                      </Button>
                      <Button variant="outlined" color="error" size="large"
                        startIcon={<RejectIcon />} onClick={() => setRejectOpen(true)} disabled={acting}>
                        Từ chối
                      </Button>
                    </Box>
                  )}

                  {detail.status === "APPROVED" && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Phiếu đã được duyệt — tồn kho website đã cập nhật.
                    </Alert>
                  )}
                  {detail.status === "REJECTED" && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Phiếu đã bị từ chối.{detail.adminNote ? ` Lý do: ${detail.adminNote}` : ""}
                    </Alert>
                  )}
                </Box>
              ) : (
                <Alert severity="warning">Không tải được chi tiết phiếu.</Alert>
              )}
            </Grid>
          </Grid>
        )}
      </Box>

      <Dialog open={rejectOpen} onClose={() => !acting && setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối phiếu kiểm kê</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline minRows={3} label="Lý do từ chối"
            placeholder="VD: Cần kiểm đếm lại — số liệu chưa khớp với biên bản"
            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)} disabled={acting}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={acting}>
            Xác nhận từ chối
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default InventoryAuditApprovalPage;
