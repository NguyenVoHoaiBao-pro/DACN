/**
 * Màn hình 1 — Picking List: Đơn hàng cần xuất / chờ gom hàng
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Chip, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Alert,
} from "@mui/material";
import {
  LocalShipping as ShipIcon, Refresh as RefreshIcon, PlayArrow as StartIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { fetchWarehouseFulfillmentQueue } from "../../services/orderService";
import { formatMoney } from "../../utils/formatters";
import { PICKING_STATUS } from "../../utils/warehouseFulfillment";
import { toast } from "react-toastify";

const WarehouseFulfillmentPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchWarehouseFulfillmentQueue(0, 50);
      setOrders(page?.content || []);
    } catch {
      toast.error("Không tải được danh sách đơn cần xuất.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStartPicking = (orderId) => {
    navigate(`/admin/warehouse-fulfillment/${orderId}`);
  };

  const pendingCount = orders.filter((o) => o.status === "CONFIRMED").length;

  return (
    <AdminLayout currentPage="Đơn hàng cần xuất">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3, gap: 2, flexWrap: "wrap" }}>
          <ShipIcon sx={{ fontSize: 36, color: "#1976d2" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold">
              Đơn hàng cần xuất
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Danh sách đơn đã xác nhận, chờ nhân viên kho gom hàng và quét Serial xuất kho.
            </Typography>
          </Box>
          <Chip
            label={`${pendingCount} đơn chờ gom hàng`}
            color="warning"
            sx={{ fontWeight: 700 }}
          />
          <Button startIcon={<RefreshIcon />} onClick={load}>
            Làm mới
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Đơn mới từ website vào đây sau khi <strong>Sales/Admin xác nhận</strong> (trạng thái Chờ gom hàng).
          Bấm <strong>Bắt đầu gom hàng</strong> để quét Serial theo FIFO và in nhãn giao.
        </Alert>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#fff8e1" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Mã đơn</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sản phẩm & SL</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Khách hàng</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Vận chuyển</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Tổng tiền</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => {
                  const st = PICKING_STATUS[o.status] || { label: o.statusDisplay, color: "default" };
                  const productLine = o.productSummary
                    || (o.firstItemName
                      ? `${o.firstItemName}${o.totalItems > 1 ? ` (+${o.totalItems - 1} SP)` : ""}`
                      : "—");
                  return (
                    <TableRow key={o.id} hover>
                      <TableCell>
                        <Typography fontWeight={800} color="primary">
                          {o.orderCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {o.orderDate ? new Date(o.orderDate).toLocaleString("vi-VN") : ""}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2">{productLine}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {o.shippingName || o.customerName || "—"}
                        </Typography>
                        {o.shippingPhone && (
                          <Typography variant="caption" color="text.secondary">
                            {o.shippingPhone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {o.carrierLabel || "GHN"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={st.label}
                          color={st.color}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatMoney(o.totalAmount)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<StartIcon />}
                          onClick={() => handleStartPicking(o.id)}
                          sx={{ fontWeight: 700, textTransform: "none" }}
                        >
                          Bắt đầu gom hàng
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      Không có đơn chờ gom hàng.
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

export default WarehouseFulfillmentPage;
