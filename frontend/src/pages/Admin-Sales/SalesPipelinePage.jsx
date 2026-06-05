/**
 * Pipeline Kanban + Hiệu suất Sales (API thật)
 */
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { usePermissions } from "../../hooks/usePermissions";
import {
  fetchMyKpi,
  fetchPipeline,
  fetchSalesUsers,
  fetchStaffKpi,
  ORDER_SOURCE_LABELS,
  updatePipelineStatus,
} from "../../services/salesOpsService";

const PIPELINE_COLUMNS = [
  { key: "NEW_ASSIGNED", title: "Đơn mới chia", color: "#f59e0b" },
  { key: "CALLING", title: "Đang gọi xác nhận", color: "#3b82f6" },
  { key: "THINKING", title: "Khách hẹn suy nghĩ", color: "#8b5cf6" },
  { key: "APPROVED_WAREHOUSE", title: "Đã duyệt → Kho", color: "#16a34a" },
];

const PIPELINE_OPTIONS = PIPELINE_COLUMNS.map((c) => c.key);

const NEXT_STATUS = {
  NEW_ASSIGNED: "CALLING",
  CALLING: "THINKING",
  THINKING: "APPROVED_WAREHOUSE",
};

const fmt = (n) => (n != null ? Number(n).toLocaleString("vi-VN") : "0");
const sourceLabel = (code) => ORDER_SOURCE_LABELS[code] || code;

const KanbanColumn = ({ title, color, cards, onAdvance, onStatusChange }) => (
  <Paper sx={{ flex: 1, minWidth: 220, bgcolor: "#f8fafc", p: 1.5, maxHeight: 520, overflow: "auto" }}>
    <Typography variant="subtitle2" fontWeight="bold" sx={{ color, mb: 1.5 }}>
      {title} ({cards.length})
    </Typography>
    {cards.map((c) => (
      <Card key={c.orderId} sx={{ mb: 1.5 }} variant="outlined">
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography
            variant="body2"
            fontWeight="bold"
            component={Link}
            to={`/admin/orders?highlight=${c.orderId}`}
            sx={{ fontFamily: "monospace", color: "primary.main", textDecoration: "none" }}
          >
            {c.orderCode}
          </Typography>
          <Typography variant="body2">{c.customerName}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {fmt(c.totalAmount)} đ · {c.orderStatus}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {c.note}
          </Typography>
          <Chip size="small" label={sourceLabel(c.orderSource)} sx={{ mt: 0.5 }} />
          <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
            {onAdvance && NEXT_STATUS[c.pipelineStatus] && (
              <Button size="small" onClick={() => onAdvance(c)}>
                Chuyển bước →
              </Button>
            )}
            {onStatusChange && (
              <Select
                size="small"
                value={c.pipelineStatus || "NEW_ASSIGNED"}
                onChange={(e) => onStatusChange(c, e.target.value)}
                sx={{ minWidth: 130, fontSize: 12 }}
              >
                {PIPELINE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontSize: 12 }}>
                    {PIPELINE_COLUMNS.find((x) => x.key === opt)?.title || opt}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>
        </CardContent>
      </Card>
    ))}
  </Paper>
);

const KpiCards = ({ kpi }) => {
  const cancelRate = kpi?.cancelRatePercent ?? 0;
  const cancelColor = kpi?.cancelRateExceeded
    ? "error"
    : cancelRate < 3
      ? "success"
      : cancelRate > 7
        ? "warning"
        : "success";
  const progress = Math.min(100, Number(kpi?.progressPercent || 0));

  return (
    <>
      {kpi?.cancelRateExceeded && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Tỷ lệ hủy {cancelRate}% vượt ngưỡng cảnh báo {kpi.maxCancelRatePercent}% — cần cải thiện chất lượng xử lý đơn.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderTop: "4px solid #3b82f6" }}>
            <Typography variant="caption" color="text.secondary">Doanh số tạm tính</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">{fmt(kpi.provisionalRevenue)} đ</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderTop: "4px solid #16a34a" }}>
            <Typography variant="caption" color="text.secondary">Hoa hồng tích lũy</Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">{fmt(kpi.accumulatedCommission)} đ</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderTop: "4px solid #8b5cf6" }}>
            <Typography variant="caption" color="text.secondary">Đơn giao thành công</Typography>
            <Typography variant="h5" fontWeight="bold">{kpi.deliveredOrders} / {kpi.totalAssignedOrders}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderTop: "4px solid #f59e0b" }}>
            <Typography variant="caption" color="text.secondary">Tỷ lệ hủy (ngưỡng {kpi.maxCancelRatePercent}%)</Typography>
            <Typography variant="h5" fontWeight="bold" color={`${cancelColor}.main`}>{cancelRate}%</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Mục tiêu tháng: {fmt(kpi.monthlyRevenueTarget)} đ
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 12, borderRadius: 2, mb: 1 }} />
        <Typography variant="body2">Đạt {fmt(kpi.provisionalRevenue)} đ ({progress}% mục tiêu)</Typography>
      </Paper>

      <Table size="small" component={Paper}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f1f5f9" }}>
            <TableCell>Mã đơn</TableCell>
            <TableCell>Ngày</TableCell>
            <TableCell>Sản phẩm</TableCell>
            <TableCell align="right">Giá trị</TableCell>
            <TableCell>Nguồn</TableCell>
            <TableCell align="right">Hoa hồng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(kpi.commissionLines || []).map((r) => (
            <TableRow key={r.orderId}>
              <TableCell>
                <Link to={`/admin/orders?highlight=${r.orderId}`}>{r.orderCode}</Link>
              </TableCell>
              <TableCell>{r.orderDate ? new Date(r.orderDate).toLocaleDateString("vi-VN") : "—"}</TableCell>
              <TableCell>{r.firstItemName}</TableCell>
              <TableCell align="right">{fmt(r.totalAmount)} đ</TableCell>
              <TableCell><Chip size="small" label={sourceLabel(r.orderSource)} /></TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(r.commissionAmount)} đ</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

const SalesPipelinePage = () => {
  const { isAdminUser, isSalesUser } = usePermissions();
  const [tab, setTab] = useState(0);
  const [pipeline, setPipeline] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [kpi, setKpi] = useState(null);
  const [staffKpi, setStaffKpi] = useState(null);
  const [salesUsers, setSalesUsers] = useState([]);
  const [filterSalesId, setFilterSalesId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const load = async () => {
    setLoading(true);
    try {
      const salesId = filterSalesId ? Number(filterSalesId) : null;
      const allStaff = isAdminUser && !filterSalesId;
      const promises = [
        fetchPipeline(allStaff, salesId),
        fetchMyKpi(year, month),
      ];
      if (isAdminUser) {
        promises.push(fetchStaffKpi(year, month));
      }
      const [pipe, kpiData, staffData] = await Promise.all(promises);
      setPipeline(pipe?.columns || {});
      setActiveCount(pipe?.activeOrderCount ?? 0);
      setKpi(kpiData);
      if (staffData) setStaffKpi(staffData);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Không tải dữ liệu Sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUser) {
      fetchSalesUsers().then(setSalesUsers).catch(() => setSalesUsers([]));
    }
  }, [isAdminUser]);

  useEffect(() => {
    load();
  }, [year, month, filterSalesId, isAdminUser]);

  const handleAdvance = async (card) => {
    const cols = pipeline || {};
    let currentKey = card.pipelineStatus;
    if (!currentKey) {
      for (const [k, list] of Object.entries(cols)) {
        if (list.some((x) => x.orderId === card.orderId)) {
          currentKey = k;
          break;
        }
      }
    }
    const next = NEXT_STATUS[currentKey];
    if (!next) return;
    await handleStatusChange(card, next);
  };

  const handleStatusChange = async (card, newStatus) => {
    try {
      await updatePipelineStatus(card.orderId, newStatus);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <AdminLayout currentPage="Pipeline & Hiệu suất">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">Pipeline & Hiệu suất Sales</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {isAdminUser && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Nhân viên</InputLabel>
                <Select
                  label="Nhân viên"
                  value={filterSalesId}
                  onChange={(e) => setFilterSalesId(e.target.value)}
                >
                  <MenuItem value="">Tất cả Sales</MenuItem>
                  {salesUsers.map((u) => (
                    <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Năm</InputLabel>
              <Select label="Năm" value={year} onChange={(e) => setYear(e.target.value)}>
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tháng</InputLabel>
              <Select label="Tháng" value={month} onChange={(e) => setMonth(e.target.value)}>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, "0")}/{year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Tiến trình đơn (Kanban)" />
          <Tab label={isSalesUser && !isAdminUser ? "Báo cáo hoa hồng cá nhân" : "KPI cá nhân"} />
          {isAdminUser && <Tab label="KPI toàn đội Sales" />}
        </Tabs>

        {loading ? (
          <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            {tab === 0 && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {activeCount} đơn đang xử lý. Đơn đã duyệt sang Kho sẽ tự ẩn khỏi board.
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
                  {PIPELINE_COLUMNS.map((col) => (
                    <KanbanColumn
                      key={col.key}
                      title={col.title}
                      color={col.color}
                      cards={(pipeline && pipeline[col.key]) || []}
                      onAdvance={handleAdvance}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </Box>
              </>
            )}

            {tab === 1 && kpi && <KpiCards kpi={kpi} />}

            {tab === 2 && isAdminUser && staffKpi && (
              <Table size="small" component={Paper}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                    <TableCell>Nhân viên</TableCell>
                    <TableCell align="right">Doanh số</TableCell>
                    <TableCell align="right">Hoa hồng</TableCell>
                    <TableCell align="center">Đơn giao</TableCell>
                    <TableCell align="center">Tỷ lệ hủy</TableCell>
                    <TableCell align="center">% mục tiêu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(staffKpi.staffRows || []).map((row) => (
                    <TableRow key={row.salesUserId} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{row.salesUserName}</TableCell>
                      <TableCell align="right">{fmt(row.provisionalRevenue)} đ</TableCell>
                      <TableCell align="right" sx={{ color: "#16a34a", fontWeight: 700 }}>
                        {fmt(row.accumulatedCommission)} đ
                      </TableCell>
                      <TableCell align="center">{row.deliveredOrders}/{row.totalAssignedOrders}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          color={row.cancelRateExceeded ? "error" : "default"}
                          label={`${row.cancelRatePercent}%`}
                        />
                      </TableCell>
                      <TableCell align="center">{row.progressPercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Box>
    </AdminLayout>
  );
};

export default SalesPipelinePage;
