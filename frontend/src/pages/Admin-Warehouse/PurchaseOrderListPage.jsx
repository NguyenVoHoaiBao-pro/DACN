/**
 * Màn hình 1 — Danh sách Đơn mua hàng chờ xử lý (Dashboard PO)
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import {
  Search as SearchIcon,
  LocalShipping as ShippingIcon,
  Inventory2 as PoIcon,
  Refresh as RefreshIcon,
  PlayArrow as ProcessIcon,
  QrCodeScanner as ScanIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { fetchWarehousePoQueue, startPoReceiving } from "../../services/purchaseOrderService";
import { isApiSuccess, getApiErrorMessage } from "../../utils/apiResponse";
import { markPoIdsSeen } from "../../utils/warehousePoAlerts";

const STATUS_COLORS = {
  IN_TRANSIT: { bg: "#fff3e0", color: "#e65100", border: "#ffb74d" },
  APPROVED: { bg: "#fff8e1", color: "#f57f17", border: "#ffd54f" },
  RECEIVING: { bg: "#e3f2fd", color: "#1565c0", border: "#64b5f6" },
  RECEIVED: { bg: "#e8f5e9", color: "#2e7d32", border: "#81c784" },
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
};

const PurchaseOrderListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadOrders = useCallback(async (keyword = search) => {
    setLoading(true);
    try {
      const res = await fetchWarehousePoQueue(keyword.trim());
      if (isApiSuccess(res)) {
        const list = Array.isArray(res.data) ? res.data : [];
        setOrders(list);
        markPoIdsSeen(list.map((p) => p.id));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không tải được danh sách PO."));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadOrders("");
  }, [loadOrders]);

  const handleSearch = () => loadOrders(search);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleProcess = async (po) => {
    if (po.status === "RECEIVED") {
      navigate(`/admin/purchase-orders/${po.id}/receive?done=1`);
      return;
    }
    setProcessingId(po.id);
    try {
      await startPoReceiving(po.id);
      navigate(`/admin/purchase-orders/${po.id}/receive`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể bắt đầu nhập kho."));
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = orders.filter((o) => ["IN_TRANSIT", "APPROVED", "RECEIVING"].includes(o.status)).length;

  return (
    <AdminLayout currentPage="Đơn mua hàng">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
              <PoIcon sx={{ fontSize: 34, color: "#ff9f1a" }} />
              <Typography variant="h4" fontWeight="bold">
                Đơn mua hàng chờ nhập kho
              </Typography>
            </Box>
            <Typography color="text.secondary">
              Tìm PO theo mã đơn hoặc quét mã vạch trên thùng hàng, sau đó bấm &quot;Xử lý nhập kho&quot;.
            </Typography>
          </Box>
          <Chip
            icon={<ShippingIcon />}
            label={`${pendingCount} đơn cần xử lý`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              fullWidth
              placeholder="Gõ mã PO (VD: PO-2026-004) hoặc quét mã vạch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScanIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, fontWeight: 700, px: 3 }}
            >
              Tìm kiếm
            </Button>
            <IconButton onClick={() => loadOrders(search)} title="Làm mới">
              <RefreshIcon />
            </IconButton>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#ff9f1a" }} />
          </Box>
        ) : orders.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Không có đơn mua hàng đang vận chuyển hoặc chờ nhập kho.
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <Table>
              <TableHead sx={{ bgcolor: "#fafafa" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Mã PO</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nhà cung cấp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày hẹn giao</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Số dòng SP</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Tổng SL đặt</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((po) => {
                  const sc = STATUS_COLORS[po.status] || STATUS_COLORS.APPROVED;
                  const isReceived = po.status === "RECEIVED";
                  return (
                    <TableRow
                      key={po.id}
                      hover
                      sx={{
                        bgcolor: isReceived ? "#f1f8e4" : "inherit",
                        transition: "background 0.3s",
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight={700} color={isReceived ? "success.main" : "text.primary"}>
                          {po.poNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{formatDate(po.expectedDate)}</TableCell>
                      <TableCell align="center">{po.totalItemsOrdered}</TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={600}>{po.totalQuantityOrdered}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={po.statusLabel}
                          size="small"
                          sx={{
                            bgcolor: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {isReceived ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => navigate(`/admin/imei?poId=${po.id}&poNumber=${encodeURIComponent(po.poNumber)}`)}
                          >
                            Quét Serial
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={processingId === po.id ? <CircularProgress size={16} color="inherit" /> : <ProcessIcon />}
                            disabled={processingId === po.id}
                            onClick={() => handleProcess(po)}
                            sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, fontWeight: 700 }}
                          >
                            Xử lý nhập kho
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </AdminLayout>
  );
};

export default PurchaseOrderListPage;
