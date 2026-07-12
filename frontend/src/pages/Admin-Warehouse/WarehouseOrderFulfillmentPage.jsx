/**
 * Màn hình 2 — Gom hàng & xuất kho (FIFO + quét Serial + in nhãn)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  IconButton, LinearProgress, Paper, TextField, Typography,
} from "@mui/material";
import {
  ArrowBack as BackIcon, CheckCircle as OkIcon, Error as ErrIcon,
  LocalShipping as ShipIcon, Print as PrintIcon, QrCodeScanner as ScanIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import ShippingLabelDialog from "../../components/Admin-Warehouse/ShippingLabelDialog";
import {
  adminAssignImei, adminGetOrderDetail, adminUpdateOrderStatus,
} from "../../services/orderService";
import { fetchFifoSerials } from "../../services/inventoryService";
import {
  buildPickTasks, formatShelfLocation, isOrderFullyPicked,
} from "../../utils/warehouseFulfillment";
import { isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const WarehouseOrderFulfillmentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const scanRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fifoHint, setFifoHint] = useState(null);
  const [fifoLoading, setFifoLoading] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanState, setScanState] = useState("idle"); // idle | valid | invalid
  const [assigning, setAssigning] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const pickingStartedRef = useRef(false);

  const tasks = useMemo(() => buildPickTasks(order), [order]);
  const currentTask = tasks[0] || null;
  const totalUnits = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((s, i) => s + (i.quantity || 0), 0);
  }, [order]);
  const pickedUnits = totalUnits - tasks.length;
  const progressPct = totalUnits > 0 ? Math.round((pickedUnits / totalUnits) * 100) : 0;
  const allPicked = order && isOrderFullyPicked(order);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetOrderDetail(Number(orderId));
      setOrder(data);
      return data;
    } catch {
      toast.error("Không tải được chi tiết đơn hàng.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const loadFifo = useCallback(async (variantId) => {
    if (!variantId) {
      setFifoHint(null);
      return;
    }
    setFifoLoading(true);
    try {
      const res = await fetchFifoSerials(variantId, 1);
      const list = isApiSuccess(res) ? res.data : res?.data;
      const first = Array.isArray(list) ? list[0] : null;
      setFifoHint(first || null);
    } catch {
      setFifoHint(null);
      toast.warning("Không tải được gợi ý FIFO serial.");
    } finally {
      setFifoLoading(false);
    }
  }, []);

  const startPickingIfNeeded = useCallback(async (data) => {
    if (!data || pickingStartedRef.current) return;
    pickingStartedRef.current = true;
    if (data.status === "CONFIRMED") {
      try {
        const updated = await adminUpdateOrderStatus(data.id, { status: "PROCESSING" });
        setOrder(updated);
        toast.info("Đã chuyển đơn sang Đang gom hàng.");
      } catch (e) {
        toast.error(e.response?.data?.message || "Không thể bắt đầu gom hàng.");
      }
    }
  }, []);

  useEffect(() => {
    loadOrder().then((data) => {
      if (data) startPickingIfNeeded(data);
    });
  }, [loadOrder, startPickingIfNeeded]);

  useEffect(() => {
    if (currentTask?.variantId) {
      loadFifo(currentTask.variantId);
      setScanValue("");
      setScanState("idle");
      setTimeout(() => scanRef.current?.focus(), 100);
    }
  }, [currentTask?.variantId, currentTask?.unitIndex, loadFifo]);

  const expectedSerial = fifoHint?.serialNumber?.trim() || "";

  const validateScan = (value) => {
    const v = value.trim();
    if (!v || !expectedSerial) return "idle";
    return v === expectedSerial ? "valid" : "invalid";
  };

  const handleScanChange = (e) => {
    const v = e.target.value;
    setScanValue(v);
    if (!v.trim()) {
      setScanState("idle");
      return;
    }
    setScanState(validateScan(v));
  };

  const handleScanKeyDown = async (e) => {
    if (e.key === "Enter" && scanState === "valid" && !assigning) {
      e.preventDefault();
      await handleConfirmScan();
    }
  };

  const handleConfirmScan = async () => {
    if (!currentTask || scanState !== "valid" || !order) return;
    setAssigning(true);
    try {
      const updated = await adminAssignImei(order.id, {
        orderDetailId: currentTask.orderDetailId,
        imeis: [scanValue.trim()],
      });
      setOrder(updated);
      setScanValue("");
      setScanState("idle");
      toast.success("Hợp lệ — Đã lấy đúng sản phẩm cũ nhất (FIFO).");
      if (isOrderFullyPicked(updated)) {
        toast.success("Đã gom đủ hàng! Có thể in nhãn và bàn giao shipper.");
      }
    } catch (err) {
      setScanState("invalid");
      toast.error(err.response?.data?.message || "Gán Serial thất bại.");
    } finally {
      setAssigning(false);
    }
  };

  const handleDispatch = async () => {
    if (!order || !allPicked) return;
    setDispatching(true);
    try {
      const updated = await adminUpdateOrderStatus(order.id, { status: "SHIPPING" });
      setOrder(updated);
      toast.success(
        `Đã xác nhận xuất kho & bàn giao — ${updated.trackingCode ? `Vận đơn ${updated.trackingCode}` : "Đang giao hàng"}`,
      );
      setTimeout(() => navigate("/admin/warehouse-fulfillment"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể chuyển trạng thái giao hàng.");
    } finally {
      setDispatching(false);
    }
  };

  if (loading && !order) {
    return (
      <AdminLayout currentPage="Gom hàng">
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!order) return null;

  return (
    <AdminLayout currentPage="Gom hàng & xuất kho">
      <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <IconButton onClick={() => navigate("/admin/warehouse-fulfillment")}>
            <BackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              Gom hàng — {order.orderCode}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shippingName} · {order.statusDisplay}
            </Typography>
          </Box>
          <Chip label={`${pickedUnits}/${totalUnits} đã quét`} color="primary" />
        </Box>

        <LinearProgress variant="determinate" value={progressPct} sx={{ mb: 3, height: 8, borderRadius: 4 }} />

        {allPicked ? (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            Đã gom đủ hàng cho đơn này. In nhãn dán và bàn giao cho shipper.
          </Alert>
        ) : currentTask ? (
          <>
            {/* Khu vực 1 — FIFO */}
            <Card sx={{ mb: 3, border: "2px solid #1976d2", borderRadius: 3 }}>
              <CardContent>
                <Typography variant="overline" color="primary" fontWeight={700}>
                  Khu vực 1 — Chỉ dẫn vị trí (FIFO)
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                  {currentTask.productName}
                  {currentTask.variantName ? ` (${currentTask.variantName})` : ""}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Đơn vị {currentTask.unitIndex}/{currentTask.lineQuantity} · SKU: {currentTask.skuCode}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200, bgcolor: "#f8fafc" }}>
                    <Typography variant="caption" color="text.secondary">Vị trí trên kệ</Typography>
                    <Typography fontWeight={700}>
                      {fifoLoading ? "…" : formatShelfLocation(fifoHint?.shelfLocation)}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200, bgcolor: "#fff8e1" }}>
                    <Typography variant="caption" color="text.secondary">
                      Serial cũ nhất cần lấy (FIFO)
                    </Typography>
                    <Typography fontFamily="monospace" fontWeight={800} fontSize="1.1rem" color="#e65100">
                      {fifoLoading ? "…" : expectedSerial || "Không còn serial AVAILABLE"}
                    </Typography>
                    {fifoHint?.lotNumber && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Lô: {fifoHint.lotNumber}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </CardContent>
            </Card>

            {/* Khu vực 2 — Quét */}
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="overline" fontWeight={700}>
                  Khu vực 2 — Quét mã Serial xác nhận
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Quét mã IMEI/Serial trên vỏ hộp để xuất kho
                </Typography>
                <TextField
                  inputRef={scanRef}
                  fullWidth
                  label="Quét mã IMEI trên vỏ hộp để xuất kho"
                  placeholder="Dùng súng quét hoặc dán mã FIFO ở trên..."
                  value={scanValue}
                  onChange={handleScanChange}
                  onKeyDown={handleScanKeyDown}
                  disabled={assigning || !expectedSerial}
                  InputProps={{
                    startAdornment: <ScanIcon sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontFamily: "monospace",
                      fontSize: "1.05rem",
                      bgcolor: "#fff",
                      ...(scanState === "valid" && {
                        "& fieldset": { borderColor: "#4caf50", borderWidth: 2 },
                      }),
                      ...(scanState === "invalid" && {
                        "& fieldset": { borderColor: "#f44336", borderWidth: 2 },
                      }),
                    },
                  }}
                />
                {scanState === "valid" && (
                  <Alert severity="success" icon={<OkIcon />} sx={{ mt: 2 }}>
                    Hợp lệ — Đã lấy đúng sản phẩm cũ nhất
                  </Alert>
                )}
                {scanState === "invalid" && scanValue.trim() && (
                  <Alert severity="error" icon={<ErrIcon />} sx={{ mt: 2 }}>
                    Sai mã Serial. Vui lòng lấy đúng thiết bị cũ nhất ở vị trí kệ đã chỉ dẫn.
                  </Alert>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2, py: 1.2, fontWeight: 700 }}
                  disabled={scanState !== "valid" || assigning || !expectedSerial}
                  onClick={handleConfirmScan}
                >
                  {assigning ? <CircularProgress size={24} color="inherit" /> : "Xác nhận đã quét đúng"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Khu vực 3 — In nhãn & bàn giao */}
        <Card sx={{ borderRadius: 3, bgcolor: allPicked ? "#f0fdf4" : "#fafafa" }}>
          <CardContent>
            <Typography variant="overline" fontWeight={700}>
              Khu vực 3 — In nhãn & bàn giao
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                disabled={!allPicked}
                onClick={() => setLabelOpen(true)}
                sx={{ flex: 1, minWidth: 200 }}
              >
                In nhãn dán
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<ShipIcon />}
                disabled={!allPicked || dispatching || order.status === "SHIPPING"}
                onClick={handleDispatch}
                sx={{ flex: 1, minWidth: 200, fontWeight: 700 }}
              >
                {dispatching ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Xác nhận xuất kho & Bàn giao"
                )}
              </Button>
            </Box>
            {!allPicked && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Hoàn thành quét Serial cho tất cả sản phẩm để mở khóa in nhãn và bàn giao.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <ShippingLabelDialog
        open={labelOpen}
        order={order}
        onClose={() => setLabelOpen(false)}
      />
    </AdminLayout>
  );
};

export default WarehouseOrderFulfillmentPage;
