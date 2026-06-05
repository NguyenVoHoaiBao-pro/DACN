/**
 * Trang tổng quan Sales — KPI cá nhân (API thật), không dùng số liệu mock cả shop.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { ContentCopy as CopyIcon } from "@mui/icons-material";
import { selectUser } from "../../redux/appSlice";
import {
  Forum as ChatIcon,
  ShoppingCart as OrdersIcon,
  ViewKanban as PipelineIcon,
  ContactPage as CustomersIcon,
  Search as ConsultIcon,
} from "@mui/icons-material";
import { fetchMyKpi } from "../../services/salesOpsService";

const fmt = (n) => (n != null ? Number(n).toLocaleString("vi-VN") : "0");

const QUICK_LINKS = [
  { label: "Tồn kho & tư vấn", path: "/admin/inventory", icon: ConsultIcon, color: "#0ea5e9" },
  { label: "Chat đa kênh", path: "/admin/sales/chat", icon: ChatIcon, color: "#2563eb" },
  { label: "Đơn hàng", path: "/admin/orders", icon: OrdersIcon, color: "#8b5cf6" },
  { label: "Pipeline & HH", path: "/admin/sales/pipeline", icon: PipelineIcon, color: "#16a34a" },
  { label: "Hồ sơ khách hàng", path: "/admin/customers", icon: CustomersIcon, color: "#f28900" },
];

const SalesStaffHomePage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector(selectUser);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = currentUser?.id
    ? `${window.location.origin}/checkout?ref=${currentUser.id}`
    : "";

  useEffect(() => {
    const now = new Date();
    fetchMyKpi(now.getFullYear(), now.getMonth() + 1)
      .then(setKpi)
      .catch(() => setKpi(null))
      .finally(() => setLoading(false));
  }, []);

  const target = Number(kpi?.monthlyRevenueTarget || 0);
  const revenue = Number(kpi?.provisionalRevenue || 0);
  const progress = Math.min(100, Number(kpi?.progressPercent || 0));

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="#1e293b" gutterBottom>
        Tổng quan công việc Sales
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Số liệu tháng hiện tại theo đơn được gán cho bạn — không phải doanh thu toàn cửa hàng.
      </Typography>

      {referralLink && (
        <Card variant="outlined" sx={{ mb: 3, bgcolor: "#f0fdf4" }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Link giới thiệu (SALES_LINK — HH theo cấu hình Admin)
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography variant="body2" sx={{ wordBreak: "break-all", flex: 1 }}>{referralLink}</Typography>
              <Tooltip title="Sao chép link">
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    setCopied(true);
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar open={copied} autoHideDuration={2500} onClose={() => setCopied(false)} message="Đã sao chép link giới thiệu" />

      {kpi?.cancelRateExceeded && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Tỷ lệ hủy {kpi.cancelRatePercent}% vượt ngưỡng {kpi.maxCancelRatePercent}% — hãy ưu tiên xác nhận đơn chắc chắn.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Doanh số đã giao (tháng)
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {fmt(revenue)} đ
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Hoa hồng tạm tính
                </Typography>
                <Typography variant="h6" fontWeight={800} color="#16a34a">
                  {fmt(kpi?.accumulatedCommission)} đ
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Đơn đã giao
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {kpi?.deliveredOrders ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Tỷ lệ hủy
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {kpi?.cancelRatePercent != null ? `${kpi.cancelRatePercent}%` : "—"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {target > 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      Mục tiêu tháng: {fmt(target)} đ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {progress.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        Lối tắt nghiệp vụ
      </Typography>
      <Grid container spacing={2}>
        {QUICK_LINKS.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.path}>
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

export default SalesStaffHomePage;
