import { useEffect, useState } from "react";
import {
  Add as AddIcon,
  Warning as WarningIcon,
  TrendingDown as OutIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  SwapVert as SwapIcon,
  Search as ConsultIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Snackbar,
  Autocomplete,
  Avatar,
  Tooltip,
} from "@mui/material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import SalesInventoryConsultationPanel from "../../components/Sales/SalesInventoryConsultationPanel";
import { usePermissions } from "../../hooks/usePermissions";
import { getLowStockStats, createStockImport, searchVariants, getInventoryTransactions } from "../../services/inventoryService";

const InventoryManagementPage = () => {
  const { hasPermission, isSalesUser } = usePermissions();
  const canImportStock = hasPermission("STOCK_IMPORT");
  const showSalesConsultation = isSalesUser && hasPermission("PRODUCT_VIEW");
  const [activeTab, setActiveTab] = useState(showSalesConsultation ? 0 : 1);
  const [stats, setStats] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);

  // States for Transactions History
  const [transactions, setTransactions] = useState([]);
  const [transLoading, setTransLoading] = useState(false);

  // States for Autocomplete in Modal
  const [variantSearch, setVariantSearch] = useState("");
  const [variantOptions, setVariantOptions] = useState([]);
  const [vLoading, setVLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  // Import form state
  const [importForm, setImportForm] = useState({
    supplier: "",
    note: "",
    items: []
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getLowStockStats(threshold);
      if (res.success) setStats(res.data || []);
    } catch (err) {
      showToast("Lỗi khi tải dữ liệu cảnh báo tồn kho", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransLoading(true);
    try {
      const res = await getInventoryTransactions();
      if (res.success) setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTransLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTransactions();
  }, [threshold]);

  useEffect(() => {
    if (!canImportStock || variantSearch.length < 2) {
      setVariantOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setVLoading(true);
      try {
        const res = await searchVariants(variantSearch);
        if (res.success) setVariantOptions(res.data || []);
      } catch (err) {
        setVariantOptions([]);
      } finally {
        setVLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [variantSearch, canImportStock]);

  const handleImportSubmit = async () => {
    if (!importForm.supplier) {
      showToast("Vui lòng nhập nhà cung cấp", "warning");
      return;
    }
    const validItems = importForm.items.filter(item => item.variantId && item.quantity > 0);
    if (validItems.length === 0) {
      showToast("Vui lòng thêm ít nhất 1 mặt hàng hợp lệ", "warning");
      return;
    }
    try {
      const payload = {
        ...importForm,
        items: validItems.map(item => ({ variantId: parseInt(item.variantId), quantity: parseInt(item.quantity) }))
      };
      const res = await createStockImport(payload);
      if (res.success) {
        showToast("Lập phiếu nhập kho thành công!", "success");
        setOpenImportModal(false);
        setImportForm({ supplier: "", note: "", items: [] });
        fetchStats();
        fetchTransactions();
      } else {
        showToast(res.message || "Lỗi khi lập phiếu", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Lỗi kết nối", "error");
    }
  };

  const addItemToList = (variant) => {
    const exists = importForm.items.find(item => item.variantId === variant.id);
    if (exists) {
      const newItems = [...importForm.items];
      const idx = newItems.indexOf(exists);
      newItems[idx].quantity = parseInt(exists.quantity) + 1;
      setImportForm({ ...importForm, items: newItems });
      return;
    }
    setImportForm({
      ...importForm,
      items: [...importForm.items, { variantId: variant.id, name: variant.name, skuCode: variant.skuCode, quantity: 1 }]
    });
  };

  const removeItemRow = (index) => {
    setImportForm({ ...importForm, items: importForm.items.filter((_, i) => i !== index) });
  };

  const lowStockCount = stats.filter(s => s.status === "LOW_STOCK").length;
  const outOfStockCount = stats.filter(s => s.status === "OUT_OF_STOCK" || s.stockQuantity === 0).length;
  const importCount = transactions.filter(t => t.transactionType === "IMPORT").length;

  // Helper for transaction type chip
  const getTxChip = (type) => {
    const map = {
      IMPORT: { label: "Nhập kho", bgcolor: "#e6ffed", color: "#16a34a" },
      EXPORT: { label: "Xuất kho", bgcolor: "#fff1f2", color: "#e11d48" },
      RETURN: { label: "Hoàn trả", bgcolor: "#fff8e1", color: "#d97706" },
    };
    return map[type] || { label: type, bgcolor: "#f1f5f9", color: "#64748b" };
  };

  return (
    <AdminLayout currentPage="Tồn kho">
      <Box sx={{ p: 3 }}>

        {/* ═══ PAGE HEADER ═══ */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {showSalesConsultation ? "📦 Tồn Kho & Tư Vấn" : "📦 Quản Lý Tồn Kho"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {showSalesConsultation
                ? "Tra cứu tồn khả dụng, tìm SP theo tên/SKU/IMEI — phục vụ tư vấn khách hàng"
                : canImportStock
                  ? "Theo dõi và cảnh báo các mặt hàng sắp hết dựa trên ngưỡng thiết lập"
                  : "Chế độ chỉ xem — theo dõi cảnh báo tồn kho"}
            </Typography>
          </Box>
          {canImportStock && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenImportModal(true)}
              sx={{
                bgcolor: "#ff9f1a",
                "&:hover": { bgcolor: "#e68a00" },
                px: 3, py: 1.2, borderRadius: "10px",
                fontWeight: "bold", textTransform: "none", fontSize: "1rem",
                boxShadow: "0 4px 12px rgba(255,159,26,0.3)",
              }}
            >
              Lập Phiếu Nhập Kho
            </Button>
          )}
        </Box>

        {showSalesConsultation && (
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              icon={<ConsultIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Tư vấn tồn kho"
              sx={{ textTransform: "none", fontWeight: 700 }}
            />
            <Tab
              icon={<WarningIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Cảnh báo & lịch sử"
              sx={{ textTransform: "none", fontWeight: 700 }}
            />
          </Tabs>
        )}

        {showSalesConsultation && activeTab === 0 && (
          <SalesInventoryConsultationPanel showIntro={false} />
        )}

        {(!showSalesConsultation || activeTab === 1) && (
          <>
        {!canImportStock && !showSalesConsultation && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Bạn chỉ có quyền <strong>xem</strong> tồn kho. Nhập kho, cập nhật số lượng và quản lý IMEI thuộc Thủ kho / Admin.
          </Alert>
        )}

        {/* ═══ STAT CARDS — Gradient, matching other admin pages ═══ */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, mb: 3 }}>
          {/* Sắp hết hàng */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white",
            boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
            transition: "transform 0.2s",
            "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Sắp hết hàng</Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? <CircularProgress size={36} color="inherit" /> : lowStockCount}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>mặt hàng dưới ngưỡng</Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Hết hàng */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            boxShadow: "0 8px 32px rgba(239,68,68,0.3)",
            transition: "transform 0.2s",
            "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Hết hàng</Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? <CircularProgress size={36} color="inherit" /> : outOfStockCount}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>mặt hàng tồn kho = 0</Typography>
                </Box>
                <OutIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Tổng giao dịch */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            boxShadow: "0 8px 32px rgba(102,126,234,0.3)",
            transition: "transform 0.2s",
            "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Tổng giao dịch</Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {transLoading ? <CircularProgress size={36} color="inherit" /> : transactions.length}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>{importCount} phiếu nhập</Typography>
                </Box>
                <SwapIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ═══ BẢNG CẢNH BÁO TỒN KHO ═══ */}
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", mb: 3, overflow: "hidden" }}>
          {/* Card header */}
          <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between", bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "#fff3e0", width: 38, height: 38 }}>
                <WarningIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" color="#0f172a">Cảnh Báo Tồn Kho Thấp</Typography>
                <Typography variant="caption" color="text.secondary">Các mặt hàng dưới ngưỡng báo động</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <TextField
                label="Ngưỡng báo động"
                type="number"
                size="small"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                sx={{ width: 150, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchStats}
                disabled={loading}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: "bold", borderColor: "#e2e8f0", color: "#64748b" }}
              >
                Cập nhật
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress color="warning" />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3, width: 60 }}>STT</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>SKU</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Tên Sản Phẩm</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Tên Biến Thể</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Tồn Kho</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Trạng Thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8, border: 0 }}>
                        <InventoryIcon sx={{ fontSize: 56, color: "#cbd5e0", mb: 1 }} />
                        <Typography variant="h6" fontWeight="700" color="text.secondary">Tất cả mặt hàng đều an toàn</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Không có mặt hàng nào dưới ngưỡng {threshold}</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.map((item, idx) => (
                      <TableRow key={idx} hover sx={{ "&:hover": { bgcolor: "#fffbf5" }, transition: "background 0.15s" }}>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Typography variant="body2" fontWeight="700" color="#94a3b8">{String(idx + 1).padStart(2, "0")}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip label={item.skuCode || `VAR-${item.variantId}`} size="small"
                            sx={{ fontWeight: 600, bgcolor: "#f1f5f9", color: "#64748b", fontFamily: "monospace", fontSize: "0.75rem" }} />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="subtitle2" fontWeight="700" color="#1e293b">
                            {item.productName || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" fontWeight="600" color="#475569">
                            {item.variantName || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Typography fontWeight="bold" color={item.stockQuantity === 0 ? "#ef4444" : "#f59e0b"} variant="h6">
                            {item.stockQuantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Chip
                            label={item.stockQuantity === 0 ? "Hết hàng" : "Sắp hết"}
                            size="small"
                            sx={{
                              fontWeight: "bold",
                              bgcolor: item.stockQuantity === 0 ? "#fff1f2" : "#fff8e1",
                              color: item.stockQuantity === 0 ? "#e11d48" : "#d97706",
                              border: `1px solid ${item.stockQuantity === 0 ? "#fecdd3" : "#fde68a"}`,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* ═══ LỊCH SỬ BIẾN ĐỘNG KHO ═══ */}
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <Box sx={{ p: 2.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: "#ede9fe", width: 38, height: 38 }}>
              <HistoryIcon sx={{ color: "#7c3aed", fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="#0f172a">Lịch Sử Biến Động Kho</Typography>
              <Typography variant="caption" color="text.secondary">Toàn bộ các giao dịch nhập/xuất/hoàn trả</Typography>
            </Box>
          </Box>

          {transLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: "#7c3aed" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3, width: 80 }}>#ID</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Tên Sản Phẩm</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Tên Biến Thể</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, width: 110 }}>SKU</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, width: 120 }}>Loại</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, width: 100 }}>Số lượng</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Lý do</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Người thực hiện</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Thời gian</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, border: 0 }}>
                        <HistoryIcon sx={{ fontSize: 48, color: "#cbd5e0", mb: 1 }} />
                        <Typography variant="body1" fontWeight="700" color="text.secondary">Chưa có lịch sử biến động nào</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tr, idx) => {
                      const txChip = getTxChip(tr.transactionType);
                      return (
                        <TableRow key={tr.id} hover sx={{ bgcolor: idx % 2 === 0 ? "white" : "#fafbfc", "&:hover": { bgcolor: "#f5f0ff" }, transition: "background 0.15s" }}>
                          <TableCell sx={{ py: 1.5, px: 3 }}>
                            <Typography variant="caption" fontWeight="700" color="#94a3b8" sx={{ fontFamily: "monospace" }}>#{tr.id}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight="700" color="#1e293b">
                              {tr.productName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight="600" color="#475569">
                              {tr.variantName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#64748b" }}>
                              {tr.skuCode || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <Chip label={txChip.label} size="small"
                              sx={{ fontWeight: "bold", bgcolor: txChip.bgcolor, color: txChip.color, fontSize: "0.75rem" }} />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <Typography fontWeight="bold" color={tr.transactionType === "IMPORT" ? "#16a34a" : "#e11d48"} variant="body2">
                              {tr.transactionType === "IMPORT" ? `+${tr.quantity}` : `-${tr.quantity}`}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <Typography variant="body2" color="text.secondary">{tr.reason || "—"}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight="600">{tr.userName}</Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(tr.createdAt).toLocaleString("vi-VN")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* ═══ Modal Lập Phiếu Nhập Kho ═══ */}
        <Dialog open={openImportModal} onClose={() => setOpenImportModal(false)} maxWidth="md" fullWidth
          PaperProps={{ sx: { borderRadius: 4, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)" } }}>
          <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem", pb: 0.5, borderBottom: "1px solid #f1f5f9" }}>
            📥 Lập Phiếu Nhập Kho
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>

            {/* Nhà cung cấp + Ghi chú */}
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <TextField
                label="Nhà cung cấp *"
                fullWidth
                required
                value={importForm.supplier}
                onChange={(e) => setImportForm({ ...importForm, supplier: e.target.value })}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                label="Ghi chú"
                fullWidth
                value={importForm.note}
                onChange={(e) => setImportForm({ ...importForm, note: e.target.value })}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Box>

            {/* Tìm kiếm variant */}
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#ff9f1a">
              Bước 1: Tìm kiếm & Thêm mặt hàng
            </Typography>
            <Autocomplete
              options={variantOptions}
              getOptionLabel={(option) => `${option.name} (${option.skuCode})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={vLoading}
              onInputChange={(_, value) => setVariantSearch(value)}
              onChange={(_, newValue) => { if (newValue) addItemToList(newValue); }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  size="small"
                  placeholder="Nhập tên SKU hoặc tên sản phẩm để thêm..."
                  InputProps={{ ...params.InputProps, sx: { borderRadius: 2 } }}
                />
              )}
              sx={{ mb: 3 }}
            />

            {/* Danh sách sản phẩm */}
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#ff9f1a">
              Bước 2: Danh sách sản phẩm nhập
            </Typography>

            {importForm.items.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5, bgcolor: "#f8fafc", borderRadius: 3, border: "1px dashed #e2e8f0" }}>
                <InventoryIcon sx={{ fontSize: 40, color: "#cbd5e0", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Chưa có sản phẩm nào. Hãy tìm kiếm phía trên để thêm.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {importForm.items.map((item, idx) => (
                  <Box key={idx} sx={{
                    display: "flex", gap: 2, alignItems: "center",
                    p: 2, border: "1px solid #e2e8f0", borderRadius: 2,
                    bgcolor: "#fafafa", "&:hover": { bgcolor: "#fff8f0", borderColor: "#ffcc80" }, transition: "all 0.15s"
                  }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>SKU: {item.skuCode}</Typography>
                    </Box>
                    <TextField
                      label="Số lượng"
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...importForm.items];
                        newItems[idx].quantity = e.target.value;
                        setImportForm({ ...importForm, items: newItems });
                      }}
                      sx={{ width: 110, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                    <Tooltip title="Xoá khỏi danh sách">
                      <IconButton size="small" color="error" onClick={() => removeItemRow(idx)}
                        sx={{ bgcolor: "#fff1f2", "&:hover": { bgcolor: "#fee2e2" } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: "1px solid #f1f5f9", gap: 1 }}>
            <Button onClick={() => setOpenImportModal(false)} sx={{ fontWeight: "600", textTransform: "none", color: "#64748b" }}>
              Huỷ bỏ
            </Button>
            <Button onClick={handleImportSubmit} variant="contained"
              sx={{ borderRadius: 2, bgcolor: "#ff9f1a", fontWeight: "bold", px: 3, textTransform: "none", "&:hover": { bgcolor: "#e68a00" }, boxShadow: "0 4px 12px rgba(255,159,26,0.3)" }}>
              ✓ Xác Nhận Nhập Kho
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>{toast.message}</Alert>
        </Snackbar>
          </>
        )}
      </Box>
    </AdminLayout>
  );
};

export default InventoryManagementPage;
