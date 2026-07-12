/**
 * Trang tổng quan Nhân viên Kho — không gọi statistics/revenue, chỉ nghiệp vụ kho.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import {
  ReceiptLong as PoIcon,
  Warehouse as InventoryIcon,
  QrCode2 as ImeiIcon,
  AssignmentReturn as ReturnIcon,
  Inventory2 as InboundIcon,
  LocalShipping as ShippingIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { fetchWarehousePoQueue } from "../../services/purchaseOrderService";
import { getLowStockStats } from "../../services/inventoryService";
import { isApiSuccess } from "../../utils/apiResponse";
import {
  formatPoAlertMessage,
  getUnseenWarehousePos,
  markPoIdsSeen,
} from "../../utils/warehousePoAlerts";

const PENDING_PO = new Set(["IN_TRANSIT", "APPROVED", "RECEIVING"]);

const QUICK_LINKS = [
  { label: "Đơn mua hàng", path: "/admin/purchase-orders", icon: PoIcon, color: "#ff9f1a" },
  { label: "Đơn hàng cần xuất", path: "/admin/warehouse-fulfillment", icon: ShippingIcon, color: "#1976d2" },
  { label: "Nhập Serial", path: "/admin/imei", icon: ImeiIcon, color: "#16a34a" },
  { label: "Kiểm kê kho", path: "/admin/inventory-audit", icon: InventoryIcon, color: "#5c6bc0" },
  { label: "Xử lý hàng hoàn", path: "/admin/return", icon: ReturnIcon, color: "#dc2626" },
  { label: "Tiếp nhận BH", path: "/admin/warranty-inbound", icon: InboundIcon, color: "#6366f1" },
];

const WarehouseStaffHomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [poPending, setPoPending] = useState(0);
  const [poInTransit, setPoInTransit] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [newPoAlerts, setNewPoAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [poRes, stockRes] = await Promise.all([
          fetchWarehousePoQueue(""),
          getLowStockStats(10),
        ]);

        if (isApiSuccess(poRes) && Array.isArray(poRes.data)) {
          const pending = poRes.data.filter((p) => PENDING_PO.has(p.status));
          setPoPending(pending.length);
          setPoInTransit(poRes.data.filter((p) => p.status === "IN_TRANSIT").length);
          setNewPoAlerts(getUnseenWarehousePos(poRes.data));
        }

        if (isApiSuccess(stockRes) && Array.isArray(stockRes.data)) {
          setLowStockCount(stockRes.data.filter((s) => s.lowStock).length);
        }
      } catch {
        setLoadError("Không tải được số liệu kho. Kiểm tra catalog-service và đăng nhập lại.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="#1e293b" gutterBottom>
        Tổng quan công việc Kho
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Theo dõi đơn mua hàng chờ nhập, tồn kho và các tác vụ xuất/nhập hàng hôm nay.
      </Typography>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {loadError}
        </Alert>
      )}

      {newPoAlerts.length > 0 && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                markPoIdsSeen(newPoAlerts.map((p) => p.id));
                navigate("/admin/purchase-orders");
              }}
            >
              Xem ngay
            </Button>
          }
        >
          <strong>{newPoAlerts.length} đơn PO mới chờ nhập kho:</strong>{" "}
          {newPoAlerts.slice(0, 2).map(formatPoAlertMessage).join(" · ")}
          {newPoAlerts.length > 2 ? " …" : ""}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: "#ff9f1a" }} />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              variant="outlined"
              sx={{ borderColor: "#ffb74d", cursor: "pointer" }}
              onClick={() => navigate("/admin/purchase-orders")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <PoIcon sx={{ color: "#ff9f1a" }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    PO chờ nhập kho
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={900} color="#e65100">
                  {poPending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ borderColor: "#90caf9" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <ShippingIcon sx={{ color: "#1976d2" }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Đang vận chuyển
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={900} color="#1565c0">
                  {poInTransit}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              variant="outlined"
              sx={{
                borderColor: lowStockCount > 0 ? "#ef9a9a" : "#e0e0e0",
                cursor: "pointer",
              }}
              onClick={() => navigate("/admin/inventory")}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <WarningIcon sx={{ color: lowStockCount > 0 ? "#d32f2f" : "#9e9e9e" }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    SKU tồn thấp
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  color={lowStockCount > 0 ? "#c62828" : "#424242"}
                >
                  {lowStockCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        Lối tắt nghiệp vụ Kho
      </Typography>
      <Grid container spacing={2}>
        {QUICK_LINKS.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.path}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<item.icon />}
              onClick={() => navigate(item.path)}
              sx={{
                py: 2,
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 700,
                borderColor: `${item.color}40`,
                color: item.color,
                "&:hover": { borderColor: item.color, bgcolor: `${item.color}08` },
              }}
            >
              {item.label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default WarehouseStaffHomePage;
