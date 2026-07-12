/**
 * SERIAL MANAGEMENT PAGE — Nhập kho theo PO
 *
 * Trang quản lý nhập Serial Number:
 *  - Chọn PO → chọn dòng SP → quét Serial (API 2)
 *  - Upload file Excel hàng loạt (API 3)
 *  - Báo cáo tồn kho thấp (API 5)
 *
 * IMEI: dự phòng triển khai sau. Hiện chỉ lưu serial_number.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  ReceiptLong as PoIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { usePermissions } from "../../hooks/usePermissions";
import {
  importImeis,
  searchVariants,
  getLowStockStats,
} from "../../services/inventoryService";
import { fetchPoImeiQueue, fetchPoDetail, fetchPoStockLots } from "../../services/purchaseOrderService";
import { isApiSuccess } from "../../utils/apiResponse";
import { getStoredUserId } from "../../utils/authSession";
import { parseSerialsFromExcelFile } from "../../utils/parseSerialsFromExcel";

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
  const [searchParams] = useSearchParams();
  const urlPoId = searchParams.get("poId");
  const urlPoNumber = searchParams.get("poNumber");
  const urlLotId = searchParams.get("lotId");
  const urlLotNumber = searchParams.get("lotNumber");
  const { isWarehouseUser, isAdminUser, isSalesUser } = usePermissions();
  const warehousePoRequired = isWarehouseUser && !isAdminUser && !isSalesUser;

  // ─── PO LINKED WORKFLOW ───
  const [poOptions, setPoOptions] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [poDetail, setPoDetail] = useState(null);
  const [selectedPoItem, setSelectedPoItem] = useState(null);
  const [poLoading, setPoLoading] = useState(false);
  const [lotOptions, setLotOptions] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);

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
  const [batchNumber, setBatchNumber] = useState(urlLotNumber || urlPoNumber || "");
  const [note, setNote] = useState(urlPoNumber ? `Nhập Serial từ đơn mua hàng ${urlPoNumber}` : "");
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

  const loadPoDetail = useCallback(async (id) => {
    if (!id) return;
    setPoLoading(true);
    try {
      const res = await fetchPoDetail(id);
      if (isApiSuccess(res)) {
        setPoDetail(res.data);
        setSelectedPo((prev) => prev ?? {
          id: res.data.id,
          poNumber: res.data.poNumber,
          supplierName: res.data.supplierName,
          statusLabel: res.data.statusLabel,
        });
        const lotsRes = await fetchPoStockLots(id);
        if (isApiSuccess(lotsRes) && Array.isArray(lotsRes.data)) {
          setLotOptions(lotsRes.data);
          const pre = urlLotId
            ? lotsRes.data.find((l) => String(l.id) === urlLotId)
            : lotsRes.data.find((l) => l.status === "OPEN") || lotsRes.data[0];
          if (pre) {
            setSelectedLot(pre);
            setBatchNumber(pre.lotNumber);
          } else {
            setBatchNumber(res.data.poNumber);
          }
        } else {
          setBatchNumber(res.data.poNumber);
        }
        setNote(`Nhập Serial từ đơn mua hàng ${res.data.poNumber}`);
      }
    } catch {
      showToast("Không tải được chi tiết PO.", "error");
    } finally {
      setPoLoading(false);
    }
  }, []);

  const loadPoImeiQueue = useCallback(async () => {
    try {
      const res = await fetchPoImeiQueue();
      if (isApiSuccess(res) && Array.isArray(res.data)) {
        setPoOptions(res.data);
        return res.data;
      }
    } catch {
      showToast("Không tải được danh sách PO chờ quét Serial.", "error");
    }
    return [];
  }, []);

  useEffect(() => {
    loadPoImeiQueue().then((list) => {
      if (urlPoId) {
        const match = list.find((p) => String(p.id) === urlPoId);
        if (match) {
          setSelectedPo(match);
          loadPoDetail(match.id);
        } else {
          loadPoDetail(Number(urlPoId));
        }
      }
    });
  }, [urlPoId, loadPoImeiQueue, loadPoDetail]);

  const handleSelectPo = async (po) => {
    setSelectedPo(po);
    setSelectedPoItem(null);
    setSelectedVariant(null);
    setSelectedLot(null);
    setLotOptions([]);
    setSearchInput("");
    setImeiText("");
    if (po) {
      await loadPoDetail(po.id);
    } else {
      setPoDetail(null);
      setBatchNumber("");
      setNote("");
    }
  };

  const handleSelectLot = (lot) => {
    setSelectedLot(lot);
    setBatchNumber(lot?.lotNumber || "");
    setSelectedPoItem(null);
    setSelectedVariant(null);
    setImeiText("");
  };

  const handleSelectPoItem = (item) => {
    setSelectedPoItem(item);
    setSelectedVariant({
      id: item.variantId,
      skuCode: item.skuCode,
      productName: item.productName,
      variantName: item.variantName,
    });
    setImeiText("");
  };

  const poImeiRemaining = selectedPoItem?.quantityImeiRemaining ?? null;
  const poImeiRequired = selectedPoItem?.quantityImeiRequired ?? 0;
  const poImeiScanned = selectedPoItem?.quantityImeiScanned ?? 0;

  const poTotalRequired = poDetail?.items?.reduce((s, i) => s + (i.quantityImeiRequired || 0), 0) ?? 0;
  const poTotalScanned = poDetail?.items?.reduce((s, i) => s + (i.quantityImeiScanned || 0), 0) ?? 0;
  const poProgressPct = poTotalRequired > 0 ? Math.round((poTotalScanned / poTotalRequired) * 100) : 0;

  // ═════════════════════════════════════════════════════════════════════════
  // AUTOCOMPLETE — API 1: Tìm Variant (Admin — nhập tự do)
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
  const exceedsPoLimit = poImeiRemaining != null && uniqueImeis.length > poImeiRemaining;

  // ═════════════════════════════════════════════════════════════════════════
  // SUBMIT — API 2: Nhập IMEI Thủ Công
  // ═════════════════════════════════════════════════════════════════════════
  const handleManualSubmit = async () => {
    if (warehousePoRequired && !selectedPo) {
      showToast("Vui lòng chọn Đơn mua hàng (PO) trước khi quét Serial.", "warning");
      return;
    }
    if (warehousePoRequired && !selectedPoItem) {
      showToast("Vui lòng chọn dòng sản phẩm trong PO cần quét Serial.", "warning");
      return;
    }
    if (warehousePoRequired && selectedPo && !selectedLot) {
      showToast("Vui lòng chọn Mã lô hàng (đợt giao) trước khi quét Serial.", "warning");
      return;
    }
    if (!selectedVariant) {
      showToast("Vui lòng chọn sản phẩm (Variant) cần nhập!", "warning");
      return;
    }
    if (uniqueImeis.length === 0) {
      showToast("Vui lòng nhập ít nhất 1 mã Serial.", "warning");
      return;
    }
    if (exceedsPoLimit) {
      showToast(`Chỉ còn ${poImeiRemaining} mã Serial cần quét cho dòng này.`, "warning");
      return;
    }

    setSubmitLoading(true);
    try {
      const actorUserId = getStoredUserId();
      if (!actorUserId) {
        showToast("Không xác định được tài khoản. Vui lòng đăng xuất và đăng nhập lại.", "error");
        setSubmitLoading(false);
        return;
      }
      const payload = {
        variantId: selectedVariant.id,
        imeis: uniqueImeis,
        batchNumber: batchNumber || undefined,
        note: note || undefined,
        userId: actorUserId,
        ...(selectedPo && selectedPoItem
          ? {
              purchaseOrderId: selectedPo.id,
              purchaseOrderItemId: selectedPoItem.id,
              stockLotId: selectedLot?.id,
            }
          : {}),
      };
      const res = await importImeis(payload);
      if (res.success) {
        const savedCount = uniqueImeis.length;
        const savedItemId = selectedPoItem?.id;
        showToast(
          res.message || `Nhập thành công ${savedCount} mã Serial vào kho! 🎉`,
          "success",
        );
        setImeiText("");
        if (selectedPo) {
          const detailRes = await fetchPoDetail(selectedPo.id);
          if (isApiSuccess(detailRes)) {
            setPoDetail(detailRes.data);
            const refreshed = detailRes.data.items?.find((i) => i.id === savedItemId);
            if (refreshed) handleSelectPoItem(refreshed);
            if (detailRes.data.status === "COMPLETED") {
              showToast(`PO ${detailRes.data.poNumber} đã hoàn tất quét Serial!`, "success");
              await loadPoImeiQueue();
            }
          } else {
            // Fallback: cập nhật local khi API refresh thất bại
            setPoDetail((prev) => {
              if (!prev?.items) return prev;
              const items = prev.items.map((i) => {
                if (i.id !== savedItemId) return i;
                const scanned = (i.quantityImeiScanned || 0) + savedCount;
                const required = i.quantityImeiRequired || 0;
                return {
                  ...i,
                  quantityImeiScanned: scanned,
                  quantityImeiRemaining: Math.max(0, required - scanned),
                };
              });
              const allDone = items.every((i) => (i.quantityImeiRemaining ?? 0) === 0);
              return { ...prev, items, status: allDone ? "COMPLETED" : prev.status };
            });
          }
        } else {
          setBatchNumber("");
          setNote("");
        }
      } else {
        showToast(res.message || "Có lỗi xảy ra khi nhập Serial.", "error");
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
    if (warehousePoRequired && !selectedPo) {
      showToast("Vui lòng chọn Đơn mua hàng (PO) ở tab Nhập thủ công trước khi import Excel.", "warning");
      return;
    }
    if (warehousePoRequired && !selectedPoItem) {
      showToast("Vui lòng chọn dòng sản phẩm trong PO (tab Nhập thủ công).", "warning");
      return;
    }
    if (warehousePoRequired && selectedPo && !selectedLot) {
      showToast("Vui lòng chọn Mã lô hàng (tab Nhập thủ công).", "warning");
      return;
    }
    if (!selectedVariant && !selectedPoItem) {
      showToast("Chọn PO + dòng sản phẩm ở tab Nhập thủ công, hoặc chọn Variant (Admin).", "warning");
      return;
    }

    setUploadLoading(true);
    try {
      const codes = await parseSerialsFromExcelFile(excelFile);
      if (!codes.length) {
        showToast("Không tìm thấy mã Serial/IMEI hợp lệ trong file Excel.", "warning");
        return;
      }
      const uniqueCodes = [...new Set(codes)];
      const remaining = poImeiRemaining;
      if (remaining != null && uniqueCodes.length > remaining) {
        showToast(`File có ${uniqueCodes.length} mã nhưng PO chỉ cần thêm ${remaining} Serial.`, "warning");
        return;
      }

      const actorUserId = getStoredUserId();
      if (!actorUserId) {
        showToast("Không xác định được tài khoản. Vui lòng đăng xuất và đăng nhập lại.", "error");
        return;
      }

      const variantId = selectedVariant?.id ?? selectedPoItem?.variantId;
      const payload = {
        variantId,
        imeis: uniqueCodes,
        batchNumber: batchNumber || undefined,
        note: note || `Import Excel ${excelFile.name}`,
        userId: actorUserId,
        ...(selectedPo && selectedPoItem
          ? {
              purchaseOrderId: selectedPo.id,
              purchaseOrderItemId: selectedPoItem.id,
              stockLotId: selectedLot?.id,
            }
          : {}),
      };
      const res = await importImeis(payload);
      if (res.success) {
        showToast(res.message || `Import thành công ${uniqueCodes.length} mã Serial từ Excel!`, "success");
        setExcelFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (selectedPo) {
          await loadPoDetail(selectedPo.id);
          await loadPoImeiQueue();
        }
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
    const csvContent = "SKU,Serial\nIP16-PRO-256-DEN,SN-F2LDN3K4N741\nIP16-PRO-256-DEN,SN-H8K9M2P5Q123\nSS-S24-ULTRA-512,SN-J3L6N9R2T456\n";
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "serial_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải file mẫu! Lưu ý: khi upload phải convert sang .xlsx", "info");
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <AdminLayout currentPage="Nhập Serial">
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
                Quản Lý Kho & Serial
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quét Serial theo Đơn mua hàng (PO) — đối chiếu số lượng đã nhập kho
              </Typography>
            </Box>
          </Box>
          {warehousePoRequired && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Nhân viên Kho <strong>bắt buộc</strong> chọn PO đã nhập kho trước khi quét Serial. Không nhập kho tự do.
            </Alert>
          )}
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
                  <InventoryIcon sx={{ color: ACCENT }} /> Nhập Serial theo PO
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {/* ── Bước 1: Chọn PO ── */}
                <Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PoIcon fontSize="small" sx={{ color: ACCENT }} />
                  Bước 1: Chọn Đơn mua hàng (PO)
                </Typography>
                <Autocomplete
                  options={poOptions}
                  getOptionLabel={(o) => `${o.poNumber} — ${o.supplierName} (${o.statusLabel})`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={selectedPo}
                  onChange={(_, v) => handleSelectPo(v)}
                  loading={poLoading}
                  noOptionsText="Không có PO chờ quét Serial. Hoàn thành kiểm đếm PO trước."
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Chọn PO đã nhập kho, chờ quét Serial..."
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 }, mb: 2 }}
                    />
                  )}
                />

                {poLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

                {lotOptions.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                      Bước 1b: Chọn Mã lô hàng (đợt giao)
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                      {lotOptions.map((lot) => (
                        <Chip
                          key={lot.id}
                          label={`${lot.lotNumber} · ${lot.itemsScanned}/${lot.itemsRequired} · ${lot.status}`}
                          clickable
                          color={selectedLot?.id === lot.id ? "warning" : "default"}
                          variant={selectedLot?.id === lot.id ? "filled" : "outlined"}
                          onClick={() => handleSelectLot(lot)}
                        />
                      ))}
                    </Box>
                  </>
                )}

                {/* ── Bước 2: Chọn dòng SP trong PO ── */}
                {poDetail?.items?.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                      Bước 2: Chọn sản phẩm cần quét Serial
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: "#fafafa" }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Cần quét</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Đã quét</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Còn lại</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {poDetail.items.map((item) => {
                            const done = (item.quantityImeiRemaining ?? 0) === 0;
                            const active = selectedPoItem?.id === item.id;
                            return (
                              <TableRow
                                key={item.id}
                                hover
                                selected={active}
                                onClick={() => !done && handleSelectPoItem(item)}
                                sx={{
                                  cursor: done ? "default" : "pointer",
                                  opacity: done ? 0.55 : 1,
                                  bgcolor: active ? "#fff8ef" : done ? "#f0fdf4" : "inherit",
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                                  <Typography variant="caption" color="text.secondary">{item.variantName} · {item.skuCode}</Typography>
                                </TableCell>
                                <TableCell align="center">{item.quantityImeiRequired}</TableCell>
                                <TableCell align="center">
                                  <Chip label={item.quantityImeiScanned} size="small" color={done ? "success" : "default"} />
                                </TableCell>
                                <TableCell align="center">
                                  {done ? <CheckIcon color="success" fontSize="small" /> : item.quantityImeiRemaining}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                {selectedPoItem && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    Đang quét: <strong>{selectedPoItem.productName}</strong> — cần thêm{" "}
                    <strong>{poImeiRemaining}</strong> mã Serial (đã quét {poImeiScanned}/{poImeiRequired})
                  </Alert>
                )}

                {/* Admin: tìm sản phẩm tự do (không qua PO) */}
                {!warehousePoRequired && !selectedPo && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                      <SearchIcon fontSize="small" sx={{ color: ACCENT }} />
                      Hoặc tìm sản phẩm thủ công (Admin)
                    </Typography>
                    <Autocomplete
                      options={variantOptions}
                      getOptionLabel={(o) => `${o.productName} — ${o.variantName} (${o.skuCode})`}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      value={selectedVariant}
                      onChange={(_, v) => { setSelectedVariant(v); setSelectedPoItem(null); }}
                      inputValue={searchInput}
                      onInputChange={(_, v) => setSearchInput(v)}
                      loading={searchLoading}
                      noOptionsText={searchInput.length < 2 ? "Gõ ít nhất 2 ký tự..." : "Không tìm thấy"}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Tên SP, SKU..." size="small" sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      )}
                    />
                  </>
                )}

                {/* ── Batch & Note (tự điền từ PO) ── */}
                <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
                  <TextField
                    label="Mã lô hàng"
                    size="small"
                    fullWidth
                    value={batchNumber}
                    disabled={!!selectedLot}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                  <TextField
                    label="Ghi chú"
                    size="small"
                    fullWidth
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Box>

                {/* ── IMEI Textarea ── */}
                <Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PasteIcon fontSize="small" sx={{ color: ACCENT }} />
                  Bước 3: Nhập / Quét Serial (mỗi dòng 1 mã)
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
                  placeholder={`SN-F2LDN3K4N741\nSN-H8K9M2P5Q123\nSN-J3L6N9R2T456`}
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

                {exceedsPoLimit && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    Vượt quá số lượng cần quét! Chỉ còn <strong>{poImeiRemaining}</strong> mã cho dòng này.
                  </Alert>
                )}

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
                    disabled={
                      submitLoading ||
                      parsedImeis.length === 0 ||
                      !selectedVariant ||
                      exceedsPoLimit ||
                      (warehousePoRequired && (!selectedPo || !selectedPoItem))
                    }
                    startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{ ...btnPrimary, px: 4, py: 1.2, fontSize: "0.95rem" }}
                  >
                    {submitLoading
                      ? "Đang xử lý..."
                      : poImeiRemaining != null
                        ? `📥 Nhập (${uniqueImeis.length}/${poImeiRemaining} còn lại)`
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
                  <QrIcon sx={{ color: ACCENT }} /> Tiến độ & Xem trước
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {poDetail && (
                  <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: "#fff8ef", border: "1px solid #ffd8a8" }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#e65100">
                      {poDetail.poNumber} — {poDetail.supplierName}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tiến độ quét Serial toàn PO
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {poTotalScanned}/{poTotalRequired} ({poProgressPct}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={poProgressPct}
                      sx={{ height: 8, borderRadius: 4, bgcolor: "#ffe0b2", "& .MuiLinearProgress-bar": { bgcolor: ACCENT } }}
                    />
                    {selectedPoItem && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Dòng đang quét: {selectedPoItem.productName}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={poImeiRequired > 0 ? Math.min(100, (poImeiScanned / poImeiRequired) * 100) : 0}
                          sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: "#e8f5e9", "& .MuiLinearProgress-bar": { bgcolor: "#16a34a" } }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

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
                    Có Serial trùng lặp! Hệ thống sẽ tự động loại bỏ trùng và chỉ gửi{" "}
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
                        Nhập hoặc quét mã Serial ở bên trái để xem trước
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
                  Upload file <code>.xlsx</code> — cột <strong>Serial</strong> (hoặc SKU + Serial).
                  Chọn PO + dòng SP + mã lô ở tab <strong>Nhập thủ công</strong> trước khi import.
                  File mẫu: <code>test-data/PO-3542D9D5-Dong-ho-25-serial.xlsx</code>
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
                        <th>Cột B (Serial)</th>
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
