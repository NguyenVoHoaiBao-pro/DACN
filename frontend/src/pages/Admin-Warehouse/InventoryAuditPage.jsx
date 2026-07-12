/**
 * Kiểm kê kho — 3 màn hình: Tạo phiếu → Quét đếm → Báo cáo (gửi Admin duyệt riêng)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Step, StepLabel,
  Stepper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import {
  FactCheck as AuditIcon, PlayArrow as StartIcon, Send as SendIcon,
  ArrowBack as BackIcon, UploadFile as UploadFileIcon, TableChart as ExcelIcon,
} from "@mui/icons-material";
import { parseSerialsFromExcelFile } from "../../utils/parseSerialsFromExcel";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { adminGetCategories } from "../../services/masterService";
import {
  bulkScanInventoryAudit, completeInventoryAudit, createInventoryAudit,
  fetchInventoryAuditDetail, fetchInventoryAuditProgress, fetchInventoryAudits,
  scanInventoryAudit, submitInventoryAudit,
} from "../../services/inventoryAuditService";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const STEPS = ["Tạo phiếu", "Quét đếm", "Báo cáo"];

const STATUS_COLOR = {
  IN_PROGRESS: "info",
  COMPLETED: "warning",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const variantLabel = (v) => {
  const name = v.productName || v.skuCode || "Sản phẩm";
  return v.variantName ? `${name} (${v.variantName})` : name;
};

/** Tách nhiều serial khi dán từ Excel (mỗi dòng / mỗi ô). */
const parseSerialInput = (text) => {
  const codes = [];
  const seen = new Set();
  for (const line of String(text).split(/[\r\n]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let token = trimmed;
    if (trimmed.includes("\t")) {
      const cols = trimmed.split("\t").map((c) => c.trim()).filter(Boolean);
      const serialCol = cols.find((c) => /^(ES\d{10,}|\d{12,20}|IMEI)/i.test(c));
      token = serialCol || cols[6] || cols[cols.length - 1] || trimmed;
    }
    if (token.length > 100) continue;
    const key = token.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      codes.push(token);
    }
  }
  return codes;
};

const matchRowSx = (status) => {
  if (status === "MATCH") return { bgcolor: "#f0fdf4" };
  if (status === "SHORTAGE") return { bgcolor: "#fef2f2" };
  if (status === "SURPLUS") return { bgcolor: "#fff7ed" };
  return {};
};

const InventoryAuditPage = () => {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [audits, setAudits] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [detail, setDetail] = useState(null);
  const [serial, setSerial] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bulkPaste, setBulkPaste] = useState("");
  const [scanProgress, setScanProgress] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [excelDragActive, setExcelDragActive] = useState(false);
  const inputRef = useRef(null);
  const bulkRef = useRef(null);
  const excelInputRef = useRef(null);

  const loadAudits = useCallback(async () => {
    try {
      const res = await fetchInventoryAudits();
      if (isApiSuccess(res)) setAudits(res.data || []);
    } catch {
      toast.error("Không tải được phiếu kiểm kê.");
    }
  }, []);

  const loadDetail = useCallback(async (id, lightweight = false) => {
    try {
      const res = lightweight
        ? await fetchInventoryAuditProgress(id)
        : await fetchInventoryAuditDetail(id);
      if (isApiSuccess(res)) {
        setDetail((prev) => (lightweight && prev ? { ...prev, ...res.data, variants: res.data.variants } : res.data));
        return res.data;
      }
    } catch {
      toast.error("Không tải chi tiết phiếu.");
    }
    return null;
  }, []);

  useEffect(() => {
    loadAudits();
    adminGetCategories().then((list) => setCategories(Array.isArray(list) ? list : [])).catch(() => {});
  }, [loadAudits]);

  const syncStepFromAudit = (audit, data) => {
    if (!audit) {
      setStep(0);
      return;
    }
    const st = data?.status || audit.status;
    if (st === "IN_PROGRESS") setStep(1);
    else if (st === "COMPLETED") setStep(2);
    else if (["PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(st)) setStep(2);
    else setStep(0);
  };

  const handleStartAudit = async () => {
    if (!categoryId) {
      toast.warning("Chọn danh mục cần kiểm kê.");
      return;
    }
    setLoading(true);
    try {
      const res = await createInventoryAudit({
        productTypeId: Number(categoryId),
        notes: "Kiểm kê định kỳ cuối tháng",
      });
      if (isApiSuccess(res)) {
        setActiveAudit(res.data);
        const d = await loadDetail(res.data.id);
        syncStepFromAudit(res.data, d);
        toast.success(`Đã bắt đầu kiểm kê — ${res.data.auditCode}. Tồn kho danh mục đã tạm khóa.`);
        loadAudits();
        setTimeout(() => inputRef.current?.focus(), 150);
      } else {
        toast.error(res?.message || "Tạo phiếu thất bại.");
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Tạo phiếu thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e?.preventDefault();
    if (!activeAudit || !serial.trim()) return;
    setScanning(true);
    setScanProgress("");
    try {
      const res = await scanInventoryAudit(activeAudit.id, serial.trim());
      if (isApiSuccess(res)) {
        const r = res.data;
        toast[r.scanResult === "MATCH" ? "success" : "warning"](
          `${r.serialNumber}: ${r.message}`,
          { autoClose: 2000 },
        );
        setSerial("");
        await loadDetail(activeAudit.id, true);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Quét thất bại."));
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  const handleBulkImport = async () => {
    if (!activeAudit || !bulkPaste.trim()) return;
    const codes = parseSerialInput(bulkPaste);
    if (codes.length === 0) {
      toast.warning("Không nhận diện được mã Serial hợp lệ.");
      return;
    }
    await runBulkImport(codes, "Import danh sách");
  };

  const runBulkImport = async (codes, sourceLabel) => {
    if (!activeAudit || codes.length === 0) return;
    setScanning(true);
    setScanProgress(`${sourceLabel}: đang gửi ${codes.length} mã...`);
    try {
      const res = await bulkScanInventoryAudit(activeAudit.id, codes);
      if (isApiSuccess(res)) {
        const r = res.data;
        toast.success(
          `${sourceLabel} xong: ${r.processed} mã (khớp ${r.matched}, thừa/lệch ${r.extra}, trùng ${r.duplicate || 0})`,
          { autoClose: 5000 },
        );
        setBulkPaste("");
        setExcelFile(null);
        if (excelInputRef.current) excelInputRef.current.value = "";
        await loadDetail(activeAudit.id, true);
      } else {
        toast.error(res?.message || "Import thất bại.");
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Import danh sách thất bại."));
    } finally {
      setScanning(false);
      setScanProgress("");
    }
  };

  const isExcelFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls");
  };

  const importExcelFile = async (file) => {
    if (!activeAudit || !file) return;
    if (!isExcelFile(file)) {
      toast.warning("Chỉ chấp nhận file Excel (.xlsx, .xls).");
      return;
    }
    setExcelFile(file);
    setScanning(true);
    setScanProgress(`Đang đọc file ${file.name}...`);
    try {
      const codes = await parseSerialsFromExcelFile(file);
      if (codes.length === 0) {
        toast.warning("Không tìm thấy cột Serial/IMEI hợp lệ trong file Excel.");
        setScanning(false);
        setScanProgress("");
        return;
      }
      await runBulkImport(codes, `Import Excel (${file.name})`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không đọc được file Excel."));
      setScanning(false);
      setScanProgress("");
    }
  };

  const handleExcelFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) importExcelFile(file);
  };

  const handleExcelDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setExcelDragActive(true);
    } else if (e.type === "dragleave") {
      setExcelDragActive(false);
    }
  };

  const handleExcelDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExcelDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) importExcelFile(file);
  };

  const handleCompleteCounting = async () => {
    if (!activeAudit) return;
    setLoading(true);
    try {
      const res = await completeInventoryAudit(activeAudit.id);
      if (isApiSuccess(res)) {
        toast.info(`Đối chiếu xong — Khớp: ${res.data.totalMatched}, Thiếu: ${res.data.totalMissing}, Thừa: ${res.data.totalExtra}`);
        const d = await loadDetail(activeAudit.id);
        setActiveAudit((a) => ({ ...a, status: "COMPLETED" }));
        syncStepFromAudit({ ...activeAudit, status: "COMPLETED" }, d);
        loadAudits();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Hoàn tất kiểm đếm thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!activeAudit) return;
    setLoading(true);
    try {
      const res = await submitInventoryAudit(activeAudit.id, reportNotes.trim());
      if (isApiSuccess(res)) {
        toast.success("Đã gửi báo cáo chênh lệch lên Admin.");
        setDetail(res.data);
        setActiveAudit((a) => ({ ...a, status: "PENDING_APPROVAL" }));
        loadAudits();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Gửi báo cáo thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const resumeAudit = async (a) => {
    setActiveAudit(a);
    const d = await loadDetail(a.id);
    syncStepFromAudit(a, d);
    if (a.status === "IN_PROGRESS") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const resetWizard = () => {
    setActiveAudit(null);
    setDetail(null);
    setStep(0);
    setSerial("");
    setReportNotes("");
    setCategoryId("");
  };

  const countingProducts = useMemo(() => detail?.variants || [], [detail]);
  const totalActual = useMemo(
    () => countingProducts.reduce((s, v) => s + (v.actualQty || 0), 0),
    [countingProducts],
  );

  const canSubmit = detail?.status === "COMPLETED";

  return (
    <AdminLayout currentPage="Kiểm kê kho">
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <AuditIcon sx={{ fontSize: 32, color: "#5c6bc0" }} />
          <Typography variant="h5" fontWeight="bold">Kiểm kê kho hàng</Typography>
          {activeAudit && (
            <Chip label={activeAudit.auditCode} color="primary" sx={{ ml: 1 }} />
          )}
          {activeAudit && (
            <Button size="small" startIcon={<BackIcon />} onClick={resetWizard} sx={{ ml: "auto" }}>
              Phiếu mới
            </Button>
          )}
        </Box>

        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* MÀN 1 — Tạo phiếu */}
        {step === 0 && !activeAudit && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography fontWeight={700} gutterBottom>Màn 1 — Tạo phiếu kiểm kê</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Chọn danh mục cần kiểm. Hệ thống chụp số tồn kho và tạm khóa bán lẻ trong lúc kiểm.
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Danh mục / khu vực kho</InputLabel>
                    <Select
                      label="Danh mục / khu vực kho"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button fullWidth variant="contained" size="large" startIcon={<StartIcon />}
                    onClick={handleStartAudit} disabled={loading || !categoryId}>
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Bắt đầu kiểm kho"}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography fontWeight={700} gutterBottom>Phiếu gần đây</Typography>
                  {audits.length === 0 && <Alert severity="info">Chưa có phiếu kiểm kê.</Alert>}
                  {audits.slice(0, 8).map((a) => (
                    <Button key={a.id} fullWidth variant="outlined" size="small"
                      onClick={() => resumeAudit(a)} sx={{ mb: 1, justifyContent: "space-between" }}>
                      <span>{a.auditCode} — {a.productTypeName || "—"}</span>
                      <Chip label={a.statusLabel} size="small" color={STATUS_COLOR[a.status] || "default"} />
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* MÀN 2 — Quét đếm */}
        {step === 1 && activeAudit && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                <Typography fontWeight={700} gutterBottom>Danh sách cần kiểm</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Số lượng hệ thống được ẩn — chỉ hiện tiến độ quét thực tế.
                </Typography>
                <Chip label={`Đã quét: ${totalActual} mã`} color="primary" sx={{ mb: 2 }} />
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell align="right">SL thực tế</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {countingProducts.map((v) => (
                        <TableRow key={v.variantId || v.id}>
                          <TableCell>{variantLabel(v)}</TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={v.actualQty ?? 0}
                              color={(v.actualQty ?? 0) > 0 ? "success" : "default"} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography fontWeight={700} gutterBottom>Màn 2 — Quét Serial/IMEI trên kệ</Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Danh mục: <strong>{detail?.productTypeName || activeAudit.productTypeName}</strong>
                    {detail?.stockLocked && " — Tồn kho đang khóa trong lúc kiểm."}
                  </Alert>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Quét từng mã (súng quét)
                  </Typography>
                  <Box component="form" onSubmit={handleScan} sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField fullWidth size="small" inputRef={inputRef}
                      placeholder="Quét hoặc dán 1 mã Serial — Enter"
                      value={serial} onChange={(e) => setSerial(e.target.value)}
                      disabled={scanning} autoFocus />
                    <Button type="submit" variant="contained" disabled={scanning} sx={{ minWidth: 90 }}>
                      Quét
                    </Button>
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Import file Excel (nhanh nhất)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Chọn hoặc kéo thả file <code>.xlsx</code> — hệ thống tự đọc cột <strong>Serial</strong> và gọi API một lần.
                  </Typography>
                  <Box
                    onDragEnter={handleExcelDrag}
                    onDragOver={handleExcelDrag}
                    onDragLeave={handleExcelDrag}
                    onDrop={handleExcelDrop}
                    sx={{
                      border: "2px dashed",
                      borderColor: excelDragActive ? "primary.main" : "#cbd5e1",
                      borderRadius: 2,
                      p: 2,
                      mb: 2,
                      textAlign: "center",
                      bgcolor: excelDragActive ? "#eff6ff" : "#f8fafc",
                      cursor: scanning ? "not-allowed" : "pointer",
                      opacity: scanning ? 0.7 : 1,
                    }}
                    onClick={() => !scanning && excelInputRef.current?.click()}
                  >
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      hidden
                      onChange={handleExcelFileSelect}
                      disabled={scanning}
                    />
                    <ExcelIcon sx={{ fontSize: 36, color: "#16a34a", mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={600}>
                      {excelFile ? excelFile.name : "Chọn hoặc kéo thả file Excel vào đây"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Hỗ trợ file export từ hệ thống (cột Serial) hoặc danh sách 1 cột mã ES...
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<UploadFileIcon />}
                      sx={{ mt: 1.5 }}
                      disabled={scanning}
                      onClick={(e) => {
                        e.stopPropagation();
                        excelInputRef.current?.click();
                      }}
                    >
                      Chọn file Excel
                    </Button>
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Hoặc dán danh sách từ Excel
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Copy cột Serial từ file Excel → dán vào ô dưới → bấm Import. Không dán vào ô quét đơn.
                  </Typography>
                  <TextField fullWidth multiline minRows={4} maxRows={8} inputRef={bulkRef}
                    placeholder="Dán nhiều dòng Serial tại đây..."
                    value={bulkPaste} onChange={(e) => setBulkPaste(e.target.value)}
                    disabled={scanning} sx={{ mb: 1, fontFamily: "monospace", fontSize: 13 }} />
                  <Button variant="outlined" fullWidth disabled={scanning || !bulkPaste.trim()}
                    onClick={handleBulkImport} sx={{ mb: 2 }}>
                    {scanning ? "Đang import..." : `Import danh sách (${parseSerialInput(bulkPaste).length || 0} mã)`}
                  </Button>
                  {scanProgress && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress />
                      <Typography variant="caption" color="text.secondary">{scanProgress}</Typography>
                    </Box>
                  )}

                  <Button variant="contained" color="secondary" fullWidth size="large"
                    onClick={handleCompleteCounting} disabled={loading || totalActual === 0}>
                    Hoàn tất kiểm đếm
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* MÀN 3 — Báo cáo */}
        {step === 2 && detail && (
          <Box>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Màn 3 — Kết quả đối chiếu</Typography>
            <Alert severity={detail.status === "PENDING_APPROVAL" ? "warning" : "info"} sx={{ mb: 2 }}>
              {detail.statusLabel}
              {detail.status === "PENDING_APPROVAL" && " — Đã gửi báo cáo. Admin duyệt tại mục «Duyệt phiếu kiểm kê»."}
              {detail.status === "APPROVED" && " — Tồn kho website đã được cập nhật."}
              {detail.status === "REJECTED" && " — Phiếu bị từ chối. Liên hệ Admin để kiểm đếm lại nếu cần."}
            </Alert>

            <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>SL hệ thống</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>SL thực tế</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Chênh lệch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detail.variants || []).map((v) => (
                    <TableRow key={v.variantId || v.id} sx={matchRowSx(v.matchStatus)}>
                      <TableCell>{variantLabel(v)}</TableCell>
                      <TableCell align="center">{v.systemQty}</TableCell>
                      <TableCell align="center">{v.actualQty}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700,
                        color: v.variance < 0 ? "#dc2626" : v.variance > 0 ? "#ea580c" : "#16a34a" }}>
                        {v.variance > 0 ? `+${v.variance}` : v.variance}
                      </TableCell>
                      <TableCell>
                        {v.matchStatus === "MATCH" && <Chip size="small" color="success" label="Khớp 100%" />}
                        {v.matchStatus === "SHORTAGE" && (
                          <Chip size="small" color="error" label={`Thất thoát (thiếu ${Math.abs(v.variance)})`} />
                        )}
                        {v.matchStatus === "SURPLUS" && (
                          <Chip size="small" color="warning" label={`Thừa ${v.variance}`} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {(detail.variants || []).some((v) => v.missingSerials?.length > 0) && (
              <Paper sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: "#fef2f2" }}>
                <Typography fontWeight={700} color="error" gutterBottom>Serial hệ thống có nhưng không quét ra</Typography>
                {(detail.variants || []).filter((v) => v.missingSerials?.length).map((v) => (
                  <Box key={v.variantId} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{variantLabel(v)}</Typography>
                    <Typography variant="caption" component="div" sx={{ fontFamily: "monospace" }}>
                      {(v.missingSerials || []).join(", ")}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}

            {canSubmit && (
              <Card sx={{ borderRadius: 3, mb: 2 }}>
                <CardContent>
                  <TextField fullWidth multiline minRows={2} label="Ghi chú báo cáo"
                    placeholder="VD: Hàng bị thiếu 2 chiếc chưa rõ nguyên nhân"
                    value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} sx={{ mb: 2 }} />
                  <Button variant="contained" color="primary" startIcon={<SendIcon />}
                    onClick={handleSubmitReport} disabled={loading}>
                    Gửi báo cáo chênh lệch lên Admin
                  </Button>
                </CardContent>
              </Card>
            )}

            {detail.discrepancies?.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography fontWeight={700} gutterBottom>Chi tiết mã lệch</Typography>
                <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: 280 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Serial</TableCell>
                        <TableCell>Loại</TableCell>
                        <TableCell>Sản phẩm</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.discrepancies.map((l) => (
                        <TableRow key={l.id || l.serialNumber}>
                          <TableCell sx={{ fontFamily: "monospace" }}>{l.serialNumber}</TableCell>
                          <TableCell>
                            <Chip size="small"
                              label={l.scanResult === "MISSING" ? "Thiếu" : "Thừa/Lệch"}
                              color={l.scanResult === "MISSING" ? "warning" : "error"} />
                          </TableCell>
                          <TableCell>{l.productName || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}
      </Box>
    </AdminLayout>
  );
};

export default InventoryAuditPage;
