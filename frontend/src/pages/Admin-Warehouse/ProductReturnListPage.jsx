/**
 * Màn 1 — Danh sách phiếu hoàn trả (Nhân viên Kho)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
  Paper, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from "@mui/material";
import {
  AssignmentReturn as ReturnIcon, Refresh as RefreshIcon,
  Search as SearchIcon, PlayArrow as ProcessIcon, Add as AddIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  fetchProductReturns, lookupOrderReturnContext, lookupProductReturn, openProductReturn,
} from "../../services/productReturnService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";

const STATUS_COLOR = { PENDING: "warning", PROCESSED: "success" };

const formatDate = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

const ProductReturnListPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProductReturns(tab);
      if (isApiSuccess(res)) setRows(res.data || []);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được danh sách phiếu hoàn."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.slipCode, r.serialNumber, r.orderCode, r.customerName, r.customerPhone, r.productName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const handleIntake = async () => {
    const kw = search.trim();
    if (!kw) {
      toast.warning("Nhập Serial, mã đơn hoặc mã vận đơn hoàn.");
      return;
    }
    setOpening(true);
    try {
      const itemRes = await lookupProductReturn(kw);
      if (!isApiSuccess(itemRes)) {
        toast.error(itemRes?.message || "Không tra cứu được Serial.");
        return;
      }
      if (itemRes.data?.hasPendingSlip) {
        navigate(`/admin/return/${itemRes.data.pendingSlipId}`);
        return;
      }
      if (itemRes.data?.customerReturnRequestCode) {
        toast.info(
          `Khách đã yêu cầu trả: ${itemRes.data.customerReturnRequestCode} (${itemRes.data.customerReturnRequestStatusLabel})`,
          { autoClose: 5000 },
        );
      }

      let orderCtx = null;
      try {
        const orderRes = await lookupOrderReturnContext(kw);
        if (isApiSuccess(orderRes)) orderCtx = orderRes.data;
      } catch {
        /* đơn có thể không tìm thấy — vẫn mở phiếu theo Serial */
      }

      const openRes = await openProductReturn({
        keyword: kw,
        orderId: orderCtx?.orderId,
        orderCode: orderCtx?.orderCode,
        customerName: orderCtx?.customerName,
        customerPhone: orderCtx?.customerPhone,
        trackingCode: orderCtx?.trackingCode,
      });
      if (isApiSuccess(openRes)) {
        toast.success(`Đã tạo phiếu ${openRes.data.slipCode}`);
        navigate(`/admin/return/${openRes.data.id}`);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tiếp nhận được phiếu hoàn."));
    } finally {
      setOpening(false);
    }
  };

  return (
    <AdminLayout currentPage="Xử lý hàng hoàn">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <ReturnIcon sx={{ fontSize: 34, color: "#dc2626" }} />
          <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
            Xử lý hàng hoàn trả
          </Typography>
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Tiếp nhận hàng bom (còn nguyên) hoặc hàng lỗi từ khách/shipper.
          Luồng <strong>Bảo hành có ticket Sales</strong> dùng mục <strong>Tiếp nhận BH</strong> riêng.
        </Alert>

        <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Tiếp nhận nhanh — quét Serial / mã đơn / vận đơn
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              size="small"
              fullWidth
              sx={{ minWidth: 280, flex: 1 }}
              placeholder="ES..., ORD-..., mã vận đơn GHTK/GHN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIntake()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={opening ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
              disabled={opening || !search.trim()}
              onClick={handleIntake}
            >
              Tiếp nhận phiếu mới
            </Button>
          </Box>
        </Paper>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Chờ tiếp nhận" value="PENDING" />
          <Tab label="Đã xử lý" value="PROCESSED" />
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
                  <TableCell sx={{ fontWeight: 700 }}>Mã phiếu</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Serial</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Đơn hàng cũ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Khách hàng</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell><strong>{r.slipCode}</strong></TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{r.serialNumber}</TableCell>
                    <TableCell>{r.orderCode || "—"}</TableCell>
                    <TableCell>
                      {r.customerName || "—"}
                      {r.customerPhone && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {r.customerPhone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{r.productName || "—"}</TableCell>
                    <TableCell>{formatDate(r.processedAt || r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.statusLabel}
                        color={STATUS_COLOR[r.status] || "default"} />
                    </TableCell>
                    <TableCell align="right">
                      {r.status === "PENDING" && (
                        <Button size="small" variant="contained" startIcon={<ProcessIcon />}
                          onClick={() => navigate(`/admin/return/${r.id}`)}>
                          Xử lý phiếu
                        </Button>
                      )}
                      {r.status === "PROCESSED" && (
                        <Button size="small" variant="outlined"
                          onClick={() => navigate(`/admin/return/${r.id}`)}>
                          Xem
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      {tab === "PENDING" ? "Chưa có phiếu chờ xử lý." : "Chưa có phiếu đã xử lý."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </AdminLayout>
  );
};

export default ProductReturnListPage;
