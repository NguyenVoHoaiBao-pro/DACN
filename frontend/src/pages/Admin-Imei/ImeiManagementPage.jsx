/**
 * IMEI MANAGEMENT PAGE — Admin Dashboard (Phase 2)
 *
 * Trang quản lý nhập IMEI/Serial Number hoàn chỉnh:
 *  - Autocomplete tìm variant (API 1)
 *  - Nhập IMEI thủ công / quét súng (API 2)
 *  - Upload file Excel hàng loạt (API 3)
 *  - Báo cáo tồn kho thấp (API 5)
 *
 * Yêu cầu: JWT Token + Permission IMEI_MANAGE
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  QrCode2 as QrIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Inventory as InventoryIcon,
  ContentPaste as PasteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  Description as ExcelIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  Assessment as StatsIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  importImeis,
  searchVariants,
  uploadImeiExcel,
  getLowStockStats,
} from "../../services/inventoryService";

// ─── DEBOUNCE HOOK ───────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const ACCENT = "#ff9f1a";
const ACCENT_HOVER = "#e68a00";
const GRADIENT = "linear-gradient(135deg, #ff9f1a 0%, #ffb74d 100%)";

const cardSx = {
  borderRadius: 3,
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid #f0f0f0",
  transition: "box-shadow 0.3s ease",
  "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
};

const btnPrimary = {
  borderRadius: 2.5,
  textTransform: "none",
  fontWeight: 700,
  bgcolor: ACCENT,
  "&:hover": { bgcolor: ACCENT_HOVER },
  boxShadow: `0 4px 20px rgba(255, 159, 26, 0.3)`,
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ═════════════════════════════════════════════════════════════════════════════
const ImeiManagementPage = () => {
  // ─── TAB STATE ───
  const [activeTab, setActiveTab] = useState(0);

  // ─── AUTOCOMPLETE STATE ───
  const [searchInput, setSearchInput] = useState("");
  const [variantOptions, setVariantOptions] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  // ─── MANUAL IMEI INPUT STATE ───
  const [imeiText, setImeiText] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // ─── EXCEL UPLOAD STATE ───
  const [excelFile, setExcelFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ─── LOW STOCK REPORT STATE ───
  const [lowStockData, setLowStockData] = useState([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [statsLoading, setStatsLoading] = useState(false);

  // ─── TOAST ───
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // AUTOCOMPLETE — API 1: Tìm Variant
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setVariantOptions([]);
      return;
    }
    const fetchVariants = async () => {
      setSearchLoading(true);
      try {
        const res = await searchVariants(debouncedSearch);
        if (res.success) {
          setVariantOptions(res.data || []);
        } else {
          setVariantOptions([]);
        }
      } catch {
        setVariantOptions([]);
      } finally {
        setSearchLoading(false);
      }
    };
    fetchVariants();
  }, [debouncedSearch]);

  // ═════════════════════════════════════════════════════════════════════════
  // PARSED IMEI LIST
  // ═════════════════════════════════════════════════════════════════════════
  const parsedImeis = imeiText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const uniqueImeis = [...new Set(parsedImeis)];
  const hasDuplicates = parsedImeis.length !== uniqueImeis.length;

  // ═════════════════════════════════════════════════════════════════════════
  // SUBMIT — API 2: Nhập IMEI Thủ Công
  // ═════════════════════════════════════════════════════════════════════════
  const handleManualSubmit = async () => {
    if (!selectedVariant) {
      showToast("Vui lòng chọn sản phẩm (Variant) cần nhập!", "warning");
      return;
    }
    if (uniqueImeis.length === 0) {
      showToast("Vui lòng nhập ít nhất 1 mã IMEI.", "warning");
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        variantId: selectedVariant.id,
        imeis: uniqueImeis,
        batchNumber: batchNumber || undefined,
        note: note || undefined,
      };
      const res = await importImeis(payload);
      if (res.success) {
        showToast(
          res.message || `Nhập thành công ${uniqueImeis.length} mã IMEI vào kho! 🎉`,
          "success",
        );
        setImeiText("");
        setBatchNumber("");
        setNote("");
      } else {
        showToast(res.message || "Có lỗi xảy ra khi nhập IMEI.", "error");
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // EXCEL UPLOAD — API 3: Upload File Excel
  // ═════════════════════════════════════════════════════════════════════════
  const handleExcelUpload = async () => {
    if (!excelFile) {
      showToast("Vui lòng chọn file Excel (.xlsx) để upload.", "warning");
      return;
    }

    setUploadLoading(true);
    try {
      const res = await uploadImeiExcel(excelFile);
      if (res.success) {
        showToast(res.message || "Import IMEI từ file Excel thành công! 🎉", "success");
        setExcelFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        showToast(res.message || "Lỗi khi import file Excel.", "error");
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        showToast("Chỉ chấp nhận file định dạng .xlsx (Excel 2007+)", "warning");
        return;
      }
      setExcelFile(file);
    }
  };

  // Drag & Drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        showToast("Chỉ chấp nhận file định dạng .xlsx (Excel 2007+)", "warning");
        return;
      }
      setExcelFile(file);
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // LOW STOCK REPORT — API 5: Báo Cáo Tồn Kho
  // ═════════════════════════════════════════════════════════════════════════
  const fetchLowStock = async () => {
    setStatsLoading(true);
    try {
      const res = await getLowStockStats(lowStockThreshold);
      if (res.success) {
        setLowStockData(res.data || []);
      }
    } catch {
      showToast("Lỗi khi tải dữ liệu cảnh báo tồn kho", "error");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 2) {
      fetchLowStock();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ═════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER CHUNG
  // ═════════════════════════════════════════════════════════════════════════
  const handleApiError = (err) => {
    if (err.response) {
      const { status, data } = err.response;
      if (status === 401) {
        showToast("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", "warning");
      } else if (status === 403) {
        showToast("Bạn không có quyền thực hiện thao tác này.", "error");
      } else if (status === 400 && data?.error) {
        // Validation error — hiển thị từng field
        const messages = Object.entries(data.error)
          .map(([, msg]) => `${msg}`)
          .join("; ");
        showToast(messages || data.message, "error");
      } else {
        showToast(data?.message || "Đã có lỗi xảy ra.", "error");
      }
    } else {
      showToast("Lỗi kết nối server. Vui lòng thử lại.", "error");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // GENERATE & DOWNLOAD EXCEL TEMPLATE
  // ═════════════════════════════════════════════════════════════════════════
  const downloadTemplate = () => {
    // Create a simple CSV template (since we don't have a xlsx lib on FE)
    const csvContent = "SKU,IMEI\nIP16-PRO-256-DEN,351234567890001\nIP16-PRO-256-DEN,351234567890002\nSS-S24-ULTRA-512,351234567890003\n";
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "imei_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải file mẫu! Lưu ý: khi upload phải convert sang .xlsx", "info");
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <AdminLayout currentPage="Nhập IMEI">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ── HEADER ── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                background: GRADIENT,
                display: "flex",
                alignItems: "center",
              }}
            >
              <QrIcon sx={{ fontSize: 28, color: "#fff" }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                Quản Lý Kho & IMEI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nhập IMEI thủ công, upload Excel, hoặc xem báo cáo tồn kho
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── TABS ── */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                minHeight: 48,
              },
              "& .Mui-selected": { color: ACCENT },
              "& .MuiTabs-indicator": { backgroundColor: ACCENT },
            }}
          >
            <Tab
              icon={<PasteIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Nhập Thủ Công / Quét Súng"
              id="imei-tab-0"
            />
            <Tab
              icon={<UploadFileIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Upload Excel"
              id="imei-tab-1"
            />
            <Tab
              icon={<StatsIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Báo Cáo Tồn Kho"
              id="imei-tab-2"
            />
          </Tabs>
        </Box>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 0: NHẬP THỦ CÔNG / QUÉT SÚNG                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
            {/* ── LEFT: Input Form ── */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <InventoryIcon sx={{ color: ACCENT }} /> Thông Tin Nhập Kho
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {/* ── Autocomplete Search ── */}
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <SearchIcon fontSize="small" sx={{ color: ACCENT }} />
                  Bước 1: Tìm sản phẩm
                </Typography>
                <Autocomplete
                  id="variant-autocomplete"
                  options={variantOptions}
                  getOptionLabel={(option) =>
                    `${option.productName} — ${option.variantName} (${option.skuCode})`
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={selectedVariant}
                  onChange={(_, newValue) => setSelectedVariant(newValue)}
                  inputValue={searchInput}
                  onInputChange={(_, newInput) => setSearchInput(newInput)}
                  loading={searchLoading}
                  noOptionsText={
                    searchInput.length < 2
                      ? "Gõ ít nhất 2 ký tự để tìm kiếm..."
                      : "Không tìm thấy sản phẩm phù hợp"
                  }
                  renderOption={(props, option) => {
                    const { key, ...restProps } = props;
                    return (
                      <Box
                        component="li"
                        key={key}
                        {...restProps}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start !important",
                          py: 1.5,
                          px: 2,
                          borderBottom: "1px solid #f5f5f5",
                          "&:hover": { bgcolor: "#fff8ef !important" },
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {option.productName} — {option.variantName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace", color: "text.secondary" }}
                        >
                          SKU: {option.skuCode} | ID: {option.id}
                        </Typography>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Gõ tên sản phẩm, variant, hoặc mã SKU..."
                      variant="outlined"
                      size="small"
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {searchLoading ? <CircularProgress size={18} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  )}
                  sx={{ mb: 2 }}
                />

                {/* ── Selected Variant Info ── */}
                {selectedVariant && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      mb: 2.5,
                      borderRadius: 2,
                      bgcolor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <CheckIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="#166534">
                        {selectedVariant.productName} — {selectedVariant.variantName}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#15803d" }}>
                        SKU: {selectedVariant.skuCode} | Variant ID: {selectedVariant.id}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedVariant(null);
                        setSearchInput("");
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}

                {/* ── Batch Number & Note ── */}
                <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
                  <TextField
                    id="batch-number"
                    label="Mã lô hàng"
                    placeholder="VD: BATCH-2025-001"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                  <TextField
                    id="note"
                    label="Ghi chú"
                    placeholder="VD: Nhập từ NCC FPT"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Box>

                {/* ── IMEI Textarea ── */}
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <PasteIcon fontSize="small" sx={{ color: ACCENT }} />
                  Bước 2: Nhập / Quét IMEI (mỗi dòng 1 mã)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  💡 Hỗ trợ nhập tay, paste, hoặc quét bằng súng barcode (tự động xuống dòng)
                </Typography>
                <TextField
                  id="imei-textarea"
                  multiline
                  rows={10}
                  fullWidth
                  value={imeiText}
                  onChange={(e) => setImeiText(e.target.value)}
                  placeholder={`351234567890111\n351234567890222\n351234567890333`}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                      fontSize: "0.88rem",
                      bgcolor: "#fafafa",
                    },
                  }}
                />

                {/* ── Action Buttons ── */}
                <Box sx={{ display: "flex", gap: 1.5, justifyContent: "space-between", alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setImeiText("")}
                    disabled={parsedImeis.length === 0}
                    size="small"
                    sx={{ borderRadius: 2, textTransform: "none" }}
                  >
                    Xóa tất cả
                  </Button>
                  <Button
                    id="imei-submit-btn"
                    variant="contained"
                    size="large"
                    onClick={handleManualSubmit}
                    disabled={submitLoading || parsedImeis.length === 0 || !selectedVariant}
                    startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{ ...btnPrimary, px: 4, py: 1.2, fontSize: "0.95rem" }}
                  >
                    {submitLoading
                      ? "Đang xử lý..."
                      : `📥 Nhập Kho (${uniqueImeis.length} mã)`}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* ── RIGHT: Preview Panel ── */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <QrIcon sx={{ color: ACCENT }} /> Xem Trước
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* ── Statistics Chips ── */}
                {parsedImeis.length > 0 && (
                  <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                    <Chip
                      label={`Tổng dòng: ${parsedImeis.length}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`Unique: ${uniqueImeis.length}`}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                    {hasDuplicates && (
                      <Chip
                        icon={<WarningIcon />}
                        label={`Trùng lặp: ${parsedImeis.length - uniqueImeis.length}`}
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                )}

                {hasDuplicates && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    Có IMEI trùng lặp! Hệ thống sẽ tự động loại bỏ trùng và chỉ gửi{" "}
                    <strong>{uniqueImeis.length}</strong> mã duy nhất.
                  </Alert>
                )}

                {/* ── IMEI List ── */}
                <Box
                  sx={{
                    maxHeight: 420,
                    overflowY: "auto",
                    pr: 0.5,
                    "&::-webkit-scrollbar": { width: 5 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "#ddd", borderRadius: 3 },
                  }}
                >
                  {parsedImeis.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                      <QrIcon sx={{ fontSize: 56, mb: 1, opacity: 0.15 }} />
                      <Typography variant="body2">
                        Nhập hoặc quét mã IMEI ở bên trái để xem trước
                      </Typography>
                    </Box>
                  ) : (
                    parsedImeis.map((imei, index) => {
                      const isDuplicate =
                        parsedImeis.indexOf(imei) !== index;
                      return (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            py: 0.8,
                            px: 1.5,
                            mb: 0.5,
                            borderRadius: 2,
                            bgcolor: isDuplicate ? "#fef9c3" : "#f0fdf4",
                            border: `1px solid ${isDuplicate ? "#fde047" : "#bbf7d0"}`,
                            transition: "all 0.15s ease",
                            "&:hover": {
                              bgcolor: isDuplicate ? "#fef08a" : "#dcfce7",
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              minWidth: 28,
                              textAlign: "center",
                              fontWeight: 600,
                              color: "text.secondary",
                            }}
                          >
                            #{index + 1}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            fontWeight={500}
                            sx={{
                              flex: 1,
                              color: isDuplicate ? "#92400e" : "#166534",
                            }}
                            noWrap
                          >
                            {imei}
                          </Typography>
                          {isDuplicate && (
                            <Chip
                              label="Trùng"
                              size="small"
                              color="warning"
                              variant="filled"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          )}
                        </Box>
                      );
                    })
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: UPLOAD EXCEL                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <Box sx={{ maxWidth: 700, mx: "auto" }}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 4 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
                >
                  <ExcelIcon sx={{ color: "#16a34a" }} /> Upload File Excel Nhập IMEI Hàng Loạt
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Upload file <code>.xlsx</code> chứa 2 cột: <strong>SKU</strong> (cột A) và{" "}
                  <strong>IMEI</strong> (cột B). Dòng 1 là Header sẽ tự động bỏ qua.
                </Typography>

                {/* ── Drag & Drop Zone ── */}
                <Box
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: `2px dashed ${dragActive ? ACCENT : "#d1d5db"}`,
                    borderRadius: 3,
                    p: 5,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: dragActive ? "#fff8ef" : excelFile ? "#f0fdf4" : "#fafafa",
                    transition: "all 0.3s ease",
                    "&:hover": { borderColor: ACCENT, bgcolor: "#fff8ef" },
                    mb: 3,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".xlsx"
                    onChange={handleFileSelect}
                  />
                  {excelFile ? (
                    <>
                      <CheckIcon sx={{ fontSize: 48, color: "#16a34a", mb: 1 }} />
                      <Typography variant="body1" fontWeight={600} color="#166534">
                        📄 {excelFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(excelFile.size / 1024).toFixed(1)} KB — Click để chọn file khác
                      </Typography>
                    </>
                  ) : (
                    <>
                      <UploadIcon sx={{ fontSize: 48, color: "#9ca3af", mb: 1 }} />
                      <Typography variant="body1" fontWeight={500} color="text.secondary">
                        Kéo thả file vào đây hoặc <span style={{ color: ACCENT, fontWeight: 700 }}>click để chọn</span>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Chỉ chấp nhận file .xlsx (Excel 2007+)
                      </Typography>
                    </>
                  )}
                </Box>

                {uploadLoading && (
                  <LinearProgress sx={{ mb: 2, borderRadius: 5, "& .MuiLinearProgress-bar": { bgcolor: ACCENT } }} />
                )}

                {/* ── Format Guide ── */}
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    📋 Format file Excel bắt buộc:
                  </Typography>
                  <Box component="table" sx={{ width: "100%", "& td, & th": { p: 0.5, fontSize: "0.8rem", border: "1px solid #e0e0e0" } }}>
                    <thead>
                      <tr>
                        <th>Cột A (SKU)</th>
                        <th>Cột B (IMEI)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td style={{ fontFamily: "monospace" }}>IP16-PRO-256-DEN</td><td style={{ fontFamily: "monospace" }}>351234567890001</td></tr>
                      <tr><td style={{ fontFamily: "monospace" }}>IP16-PRO-256-DEN</td><td style={{ fontFamily: "monospace" }}>351234567890002</td></tr>
                      <tr><td style={{ fontFamily: "monospace" }}>SS-S24-ULTRA-512</td><td style={{ fontFamily: "monospace" }}>351234567890003</td></tr>
                    </tbody>
                  </Box>
                </Alert>

                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  ⚠️ Nếu lỗi xảy ra ở bất kỳ dòng nào, <strong>toàn bộ file sẽ KHÔNG được import</strong>{" "}
                  (rollback). Hãy kiểm tra kỹ file trước khi upload.
                </Alert>

                {/* ── Action Buttons ── */}
                <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadTemplate}
                    sx={{ borderRadius: 2, textTransform: "none", borderColor: "#16a34a", color: "#16a34a" }}
                  >
                    Tải file mẫu
                  </Button>
                  <Button
                    id="excel-upload-btn"
                    variant="contained"
                    size="large"
                    onClick={handleExcelUpload}
                    disabled={uploadLoading || !excelFile}
                    startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                    sx={{ ...btnPrimary, px: 4, py: 1.2, fontSize: "0.95rem" }}
                  >
                    {uploadLoading ? "Đang upload..." : "📤 Upload & Nhập Kho"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: BÁO CÁO TỒN KHO                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <Box>
            {/* ── Summary Cards ── */}
            <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
              <Card sx={{ ...cardSx, flex: "1 1 200px" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#fff3e0" }}>
                      <WarningIcon sx={{ fontSize: 28, color: "#f57c00" }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Sắp hết hàng
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="#f57c00">
                        {lowStockData.filter((s) => s.stockQuantity > 0).length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ ...cardSx, flex: "1 1 200px" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#ffebee" }}>
                      <ErrorIcon sx={{ fontSize: 28, color: "#d32f2f" }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Hết hàng hoàn toàn
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="#d32f2f">
                        {lowStockData.filter((s) => s.stockQuantity === 0).length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ ...cardSx, flex: "1 1 200px" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#e3f2fd" }}>
                      <StatsIcon sx={{ fontSize: 28, color: "#1976d2" }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Tổng cảnh báo
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="#1976d2">
                        {lowStockData.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* ── Data Table ── */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <WarningIcon sx={{ color: "#f57c00" }} /> Danh Sách Cảnh Báo Tồn Kho Thấp
                  </Typography>
                  <TextField
                    id="low-stock-threshold"
                    label="Ngưỡng"
                    type="number"
                    size="small"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                    sx={{ width: 120, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={statsLoading ? <CircularProgress size={18} /> : <RefreshIcon />}
                    onClick={fetchLowStock}
                    disabled={statsLoading}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                  >
                    Làm mới
                  </Button>
                </Box>

                {statsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress sx={{ color: ACCENT }} />
                  </Box>
                ) : (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{ border: "1px solid #eee", borderRadius: 2 }}
                  >
                    <Table>
                      <TableHead sx={{ bgcolor: "#f8f9fa" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Mã SKU</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Tên Mặt Hàng</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Tồn Kho</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Trạng Thái</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lowStockData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                              <CheckIcon sx={{ fontSize: 40, mb: 1, opacity: 0.2 }} />
                              <Typography variant="body2">
                                {statsLoading ? "Đang tải..." : "🎉 Không có mặt hàng nào dưới ngưỡng báo động!"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          lowStockData.map((item, idx) => (
                            <TableRow key={item.variantId || idx} hover>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell sx={{ fontFamily: "monospace", fontWeight: 500 }}>
                                {item.skuCode || `VAR-${item.variantId}`}
                              </TableCell>
                              <TableCell>{item.variantName}</TableCell>
                              <TableCell align="center">
                                <Typography
                                  fontWeight="bold"
                                  color={item.stockQuantity === 0 ? "error" : "warning.main"}
                                >
                                  {item.stockQuantity}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={item.stockQuantity === 0 ? "Hết hàng" : "Sắp hết"}
                                  color={item.stockQuantity === 0 ? "error" : "warning"}
                                  size="small"
                                  variant="filled"
                                  sx={{ fontWeight: 600 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ── TOAST ── */}
        <Snackbar
          open={toast.open}
          autoHideDuration={5000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity={toast.severity}
            onClose={() => setToast({ ...toast, open: false })}
            sx={{ width: "100%", borderRadius: 2, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            variant="filled"
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </AdminLayout>
  );
};

export default ImeiManagementPage;
