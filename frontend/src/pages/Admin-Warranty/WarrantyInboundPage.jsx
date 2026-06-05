/**
 * Màn hình Tiếp nhận Hàng Bảo hành — nhân viên Kho (nhập tay bàn phím)
 */
import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Inventory2 as InboundIcon,
  CheckCircle as ValidIcon,
  Error as InvalidIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  lookupWarrantyInbound,
  markWarrantyClaimReceived,
} from "../../services/warrantyService";
import { compareImei, formatImeiGrouped } from "../../utils/warrantyInboundUtils";
import { isApiSuccess } from "../../utils/apiResponse";

const emptyForm = () => ({
  keyword: "",
  claim: null,
  boxCondition: "INTACT",
  typedImei: "",
  imeiCheck: null,
  warehouseNotes: "",
});

const WarrantyInboundPage = () => {
  const searchRef = useRef(null);
  const imeiRef = useRef(null);
  const [form, setForm] = useState(emptyForm());
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetScreen = () => {
    setForm(emptyForm());
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const handleSearch = async () => {
    const kw = form.keyword.trim();
    if (!kw) {
      toast.warning("Gõ mã vận đơn GHTK/GHN hoặc Mã Ticket bảo hành");
      return;
    }
    setSearching(true);
    setForm((f) => ({ ...f, claim: null, imeiCheck: null, typedImei: "" }));
    try {
      const res = await lookupWarrantyInbound(kw);
      if (isApiSuccess(res) && res.data) {
        setForm((f) => ({ ...f, claim: res.data, imeiCheck: null, typedImei: "" }));
        toast.success(`Đã tìm thấy ticket #${res.data.claimNumber}`);
        setTimeout(() => imeiRef.current?.focus(), 200);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.data ||
        "Không tìm thấy ticket ở trạng thái Đã duyệt thu hồi (APPROVED)";
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  };

  const handleCheckImei = () => {
    if (!form.claim) return;
    const typed = form.typedImei.trim();
    if (!typed) {
      toast.warning("Nhập IMEI thực tế trên máy trước khi kiểm tra");
      return;
    }
    const ok = compareImei(form.claim.systemImei, typed);
    setForm((f) => ({ ...f, imeiCheck: ok ? "valid" : "invalid" }));
    if (!ok) {
      toast.error(
        "Số IMEI nhập vào không khớp với đơn hàng. Vui lòng kiểm tra lại thiết bị hoặc nhập lại bằng bàn phím."
      );
    }
  };

  const canConfirm = form.claim && form.imeiCheck === "valid";

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const res = await markWarrantyClaimReceived(form.claim.id, {
        receivedImei: form.typedImei.trim(),
        boxCondition: form.boxCondition,
        warehouseNotes: form.warehouseNotes.trim(),
      });
      if (isApiSuccess(res)) {
        toast.success(`Đã nhận máy — ticket #${form.claim.claimNumber} → Chờ kiểm tra kỹ thuật`);
        resetScreen();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không xác nhận được");
    } finally {
      setSubmitting(false);
    }
  };

  const c = form.claim;

  return (
    <AdminLayout currentPage="Tiếp nhận BH">
      <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
          <InboundIcon sx={{ fontSize: 36, color: "#1976d2" }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Tiếp nhận Hàng Bảo hành
            </Typography>
            <Typography color="text.secondary">
              Nhập tay mã vận đơn / mã ticket → đối chiếu IMEI → xác nhận nhận máy (RECEIVED)
            </Typography>
          </Box>
        </Box>

        {/* PHẦN 1 — Tìm kiếm */}
        <Paper sx={{ p: 3, mb: 3, border: "2px solid #e2e8f0" }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            1. Tìm kiếm đơn (bàn phím)
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
            <TextField
              inputRef={searchRef}
              fullWidth
              autoFocus
              size="medium"
              placeholder="Gõ mã vận đơn GHTK/GHN hoặc Mã Ticket bảo hành... (VD: GHTK123456 hoặc BH-20260604-001)"
              value={form.keyword}
              onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                sx: { fontSize: "1.05rem" },
              }}
            />
            <Button
              variant="contained"
              size="large"
              disabled={searching}
              onClick={handleSearch}
              sx={{ minWidth: 140, py: 1.5 }}
            >
              {searching ? <CircularProgress size={24} color="inherit" /> : "Tìm kiếm"}
            </Button>
          </Box>
        </Paper>

        {/* PHẦN 2 — Đối chiếu */}
        {c && (
          <Paper sx={{ p: 3, mb: 3, border: "2px solid #3b82f6", bgcolor: "#f8fafc" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              2. Đối chiếu thông tin
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: "100%", borderColor: "#3b82f6" }}>
                  <CardContent>
                    <Typography variant="overline" color="primary" fontWeight="bold">
                      Hệ thống (đối chiếu bằng mắt)
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2" gutterBottom>
                      <strong>Mã Ticket:</strong> #{c.claimNumber}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Tên máy:</strong> {c.productName}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Khách:</strong> {c.contactName || "—"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Đơn vị VC:</strong> {c.returnCarrier || "—"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Mã vận đơn:</strong>{" "}
                      <span style={{ fontFamily: "monospace" }}>{c.returnTrackingCode || "—"}</span>
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, bgcolor: "#fef2f2", borderRadius: 2, border: "1px solid #fecaca" }}>
                      <Typography variant="caption" color="error" fontWeight="bold" display="block">
                        IMEI gốc (chia cụm 4 số)
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{ fontFamily: "monospace", color: "#b91c1c", letterSpacing: 1, mt: 0.5 }}
                      >
                        {c.systemImeiGrouped || formatImeiGrouped(c.systemImei)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        Raw: {c.systemImei}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: "100%", borderColor: "#f59e0b" }}>
                  <CardContent>
                    <Typography variant="overline" sx={{ color: "#d97706", fontWeight: "bold" }}>
                      Kho nhập thực tế
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Tình trạng hộp khi nhận
                    </Typography>
                    <RadioGroup
                      value={form.boxCondition}
                      onChange={(e) => setForm((f) => ({ ...f, boxCondition: e.target.value }))}
                      sx={{ mb: 2 }}
                    >
                      <FormControlLabel value="INTACT" control={<Radio />} label="Nguyên vẹn" />
                      <FormControlLabel value="DAMAGED" control={<Radio />} label="Móp méo / Rách vỡ" />
                    </RadioGroup>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      IMEI thực tế trên máy
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <TextField
                        inputRef={imeiRef}
                        fullWidth
                        placeholder="Gõ IMEI/Serial nhìn trên máy hoặc khay SIM"
                        value={form.typedImei}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, typedImei: e.target.value, imeiCheck: null }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleCheckImei()}
                        sx={{ flex: 1, minWidth: 200 }}
                        inputProps={{ style: { fontFamily: "monospace", fontSize: "1rem" } }}
                      />
                      <Button variant="outlined" onClick={handleCheckImei}>
                        Kiểm tra khớp
                      </Button>
                    </Box>

                    {form.imeiCheck === "valid" && (
                      <Alert severity="success" icon={<ValidIcon />} sx={{ mt: 2 }}>
                        <strong>Hợp lệ</strong> — IMEI khớp dữ liệu hệ thống
                      </Alert>
                    )}
                    {form.imeiCheck === "invalid" && (
                      <Alert severity="error" icon={<InvalidIcon />} sx={{ mt: 2 }}>
                        Số IMEI nhập vào không khớp với đơn hàng. Vui lòng kiểm tra lại thiết bị hoặc nhập lại bằng
                        bàn phím.
                      </Alert>
                    )}
                    {form.typedImei && form.imeiCheck === null && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Bạn đang gõ: {formatImeiGrouped(form.typedImei)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* PHẦN 3 — Hành động */}
        {c && (
          <Paper sx={{ p: 3, border: "2px solid #16a34a", bgcolor: "#f0fdf4" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              3. Chốt nhận máy
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Ghi chú nội bộ Kho"
              placeholder='VD: "Hộp hơi móp do vận chuyển, máy không trầy, đúng IMEI"'
              value={form.warehouseNotes}
              onChange={(e) => setForm((f) => ({ ...f, warehouseNotes: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                disabled={!canConfirm || submitting}
                onClick={handleConfirm}
                sx={{ minWidth: 280, py: 1.5, fontWeight: "bold" }}
              >
                {submitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "XÁC NHẬN NHẬN MÁY (RECEIVED)"
                )}
              </Button>
              <Button variant="outlined" color="inherit" size="large" startIcon={<ResetIcon />} onClick={resetScreen}>
                Hủy bỏ / Quay lại
              </Button>
            </Box>
            {!canConfirm && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Nút xác nhận chỉ bật sau khi bấm <strong>Kiểm tra khớp</strong> và hệ thống báo Hợp lệ.
              </Typography>
            )}
          </Paper>
        )}

        {!c && (
          <Alert severity="info">
            Gõ mã trên kiện shipper giao đến, nhấn Enter hoặc <strong>Tìm kiếm</strong> để bắt đầu đối chiếu.
          </Alert>
        )}
      </Box>
    </AdminLayout>
  );
};

export default WarrantyInboundPage;
