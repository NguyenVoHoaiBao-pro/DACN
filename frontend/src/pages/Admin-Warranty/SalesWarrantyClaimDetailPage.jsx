/**
 * Màn hình 2 & 3 — Chi tiết yêu cầu BH + Phán quyết sau kỹ thuật (Sales)
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ContentCopy as CopyIcon,
  LocalShipping as ShipIcon,
  Verified as MatchIcon,
  Warning as WarnIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  approveWarrantyClaim,
  closeWarrantyClaim,
  getWarrantyClaimDetail,
  getWarrantyReturnTracking,
  markWarrantyClaimReceived,
  rejectWarrantyClaim,
  resolveWarrantyClaim,
  submitWarrantyInspection,
} from "../../services/warrantyService";
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS, RESOLUTION_OPTIONS } from "../../utils/warrantyClaimStatus";
import { isApiSuccess } from "../../utils/apiResponse";
import { usePermissions } from "../../hooks/usePermissions";

const RETURN_CARRIERS = ["GHTK", "GHN", "Viettel Post", "J&T Express", "VNPost", "Khác"];

const TRACKING_VISIBLE_STATUSES = ["APPROVED", "RECEIVED", "INSPECTING", "REPAIRING", "COMPLETED"];

const SalesWarrantyClaimDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission(["WARRANTY_MANAGE", "ROLE_SALES", "SALES", "ADMIN"]);

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffNotes, setStaffNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [inspectionText, setInspectionText] = useState("");
  const [resolution, setResolution] = useState("REPLACE");
  const [resolveNotes, setResolveNotes] = useState("");
  const [returnCarrier, setReturnCarrier] = useState("GHTK");
  const [returnTrackingCode, setReturnTrackingCode] = useState("");
  const [ghnTracking, setGhnTracking] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWarrantyClaimDetail(id);
      if (isApiSuccess(res)) {
        setClaim(res.data);
        setInspectionText(res.data?.inspectionResult || "");
        setStaffNotes(res.data?.staffNotes || "");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tải được chi tiết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const sys = claim?.systemInfo;
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await approveWarrantyClaim(id, {
        staffNotes,
        returnCarrier,
        returnTrackingCode: returnTrackingCode.trim(),
      });
      if (isApiSuccess(res)) {
        toast.success("Đã duyệt thu hồi — mã vận đơn đã lưu cho Kho/Sales tra cứu");
        setClaim(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không duyệt được");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning("Nhập lý do từ chối");
      return;
    }
    setSaving(true);
    try {
      const res = await rejectWarrantyClaim(id, rejectReason);
      if (isApiSuccess(res)) {
        toast.success("Đã từ chối — thông báo gửi khách (email/SMS tích hợp sau)");
        setClaim(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi từ chối");
    } finally {
      setSaving(false);
    }
  };

  const handleInspection = async () => {
    if (!inspectionText.trim()) {
      toast.warning("Nhập biên bản kỹ thuật");
      return;
    }
    setSaving(true);
    try {
      const res = await submitWarrantyInspection(id, inspectionText);
      if (isApiSuccess(res)) {
        toast.success("Đã lưu biên bản kỹ thuật");
        setClaim(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật biên bản");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    setSaving(true);
    try {
      const res = await resolveWarrantyClaim(id, resolution, resolveNotes);
      if (isApiSuccess(res)) {
        toast.success("Đã ghi nhận phán quyết");
        setClaim(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi phán quyết");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      const res = await closeWarrantyClaim(id);
      if (isApiSuccess(res)) {
        toast.success("Đã hoàn tất ticket");
        setClaim(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi đóng ticket");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout currentPage="Yêu cầu BH online">
        <Box sx={{ p: 6, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!claim) {
    return (
      <AdminLayout currentPage="Yêu cầu BH online">
        <Box sx={{ p: 3 }}>
          <Typography>Không tìm thấy ticket</Typography>
          <Button startIcon={<BackIcon />} onClick={() => navigate("/admin/warranty-claims")}>
            Quay lại
          </Button>
        </Box>
      </AdminLayout>
    );
  }

  const showVerify = claim.status === "PENDING";
  const showResolution = claim.status === "INSPECTING";
  const showClose = claim.status === "REPAIRING";
  const showReturnTracking = TRACKING_VISIBLE_STATUSES.includes(claim.status);

  const copyTracking = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.info(`Đã copy: ${text}`);
  };

  const isGhnReturn = (carrier, code) =>
    (carrier || "").toUpperCase().includes("GHN") && code && !String(code).startsWith("GHTK-");

  const loadGhnTracking = async () => {
    setLoadingTracking(true);
    try {
      const res = await getWarrantyReturnTracking(id);
      if (isApiSuccess(res)) setGhnTracking(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tra cứu được GHN");
    } finally {
      setLoadingTracking(false);
    }
  };

  return (
    <AdminLayout currentPage="Yêu cầu BH online">
      <Box sx={{ p: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate("/admin/warranty-claims")} sx={{ mb: 2 }}>
          Danh sách ticket
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Typography variant="h5" fontWeight="bold">
            #{claim.claimNumber}
          </Typography>
          <Chip
            label={CLAIM_STATUS_LABELS[claim.status] || claim.statusDisplay}
            sx={{ bgcolor: CLAIM_STATUS_COLORS[claim.status], color: "#fff" }}
          />
        </Box>

        {/* Màn hình 2: đối chiếu trái / khách gửi phải */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: "100%", borderColor: "#3b82f6" }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
                  Hệ thống (hồ sơ khách / kho xuất)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" gutterBottom>
                  <strong>Khách hàng:</strong> {sys?.customerName || claim.contactName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>IMEI/Serial hệ thống:</strong> {sys?.systemImei || "—"}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Ngày mua:</strong> {fmtDate(sys?.purchaseDate)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>BH từ:</strong> {fmtDate(sys?.warrantyStartDate)} →{" "}
                  <strong>Hết hạn:</strong> {fmtDate(sys?.warrantyEndDate)}
                </Typography>
                <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    icon={sys?.warrantyValid ? <MatchIcon /> : <WarnIcon />}
                    label={sys?.warrantyValid ? "Còn hạn BH" : "Hết hạn BH"}
                    color={sys?.warrantyValid ? "success" : "error"}
                  />
                  <Chip
                    size="small"
                    icon={sys?.imeiMatch ? <MatchIcon /> : <WarnIcon />}
                    label={sys?.imeiMatchMessage}
                    color={sys?.imeiMatch ? "success" : "warning"}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: "100%", borderColor: "#f59e0b" }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: "#d97706" }} gutterBottom fontWeight="bold">
                  Khách gửi yêu cầu
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" gutterBottom>
                  <strong>IMEI khách nhập:</strong> {claim.submittedImei}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Sản phẩm:</strong> {claim.productName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Lý do lỗi:</strong> {claim.issueDescription}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Yêu cầu:</strong> {claim.customerRequest}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Liên hệ:</strong> {claim.contactName} · {claim.contactPhone}
                </Typography>
                {(claim.contactAddress || claim.contactProvince) && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Địa chỉ lấy hàng:</strong>{" "}
                    {[
                      claim.contactAddress,
                      claim.contactWard,
                      claim.contactDistrict,
                      claim.contactProvince,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    {claim.pickupToDistrictId && claim.pickupToWardCode && (
                      <Typography component="span" variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        GHN: quận #{claim.pickupToDistrictId}, phường {claim.pickupToWardCode}
                      </Typography>
                    )}
                  </Typography>
                )}
                <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  {claim.imageUrl1 && (
                    <Link href={claim.imageUrl1} target="_blank" rel="noopener">
                      Ảnh hóa đơn / vỏ hộp
                    </Link>
                  )}
                  {claim.imageUrl3 && (
                    <Link href={claim.imageUrl3} target="_blank" rel="noopener">
                      Ảnh minh chứng khác
                    </Link>
                  )}
                  {claim.videoUrl && (
                    <Link href={claim.videoUrl} target="_blank" rel="noopener">
                      Video quay lỗi
                    </Link>
                  )}
                  {!claim.imageUrl1 && !claim.videoUrl && (
                    <Typography variant="caption" color="text.secondary">
                      Khách chưa đính kèm ảnh/video (URL)
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {showReturnTracking && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              border: "2px solid #3b82f6",
              bgcolor: "#eff6ff",
            }}
          >
            <Typography variant="h6" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <ShipIcon color="primary" />
              Theo dõi thu hồi máy lỗi (vận chuyển)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Đơn vị vận chuyển
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {claim.returnCarrier || "—"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={8}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Mã vận đơn thu hồi
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ fontFamily: "monospace", color: "#1d4ed8" }}
                  >
                    {claim.returnTrackingCode ? `#${claim.returnTrackingCode.replace(/^#/, "")}` : "—"}
                  </Typography>
                  {claim.returnTrackingCode && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CopyIcon />}
                      onClick={() => copyTracking(claim.returnTrackingCode)}
                    >
                      Copy mã
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            {claim.returnInstruction && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Hướng dẫn khách:</strong> {claim.returnInstruction}
              </Alert>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Kho:</strong> Khi shipper giao gói máy lỗi, tra cứu ticket bằng{" "}
              <strong>mã vận đơn</strong> hoặc <strong>#{claim.claimNumber}</strong> tại danh sách Yêu cầu BH
              online → bấm <strong>Xác nhận nhận máy (RECEIVED)</strong>.
            </Alert>
            {isGhnReturn(claim.returnCarrier, claim.returnTrackingCode) && (
              <Box sx={{ mt: 2 }}>
                <Button size="small" variant="outlined" disabled={loadingTracking} onClick={loadGhnTracking}>
                  {loadingTracking ? "Đang tra GHN..." : "Tra cứu hành trình GHN"}
                </Button>
                {ghnTracking && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <strong>GHN:</strong> {ghnTracking.statusDisplay || ghnTracking.status}
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* Sales verify — PENDING */}
        {showVerify && canManage && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: "#f8fafc" }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Bước 1 — Xác thực claim (Sales)
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Kiểm tra video/ảnh và IMEI. Nếu khớp và còn hạn → Duyệt thu hồi. Ngược lại → Từ chối.
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Ghi chú Sales"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Vận chuyển thu hồi (hiển thị cho Kho khi máy về)
            </Typography>
            {claim.orderId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Chọn <strong>GHN</strong> và để trống mã vận đơn → hệ thống tự tạo vận đơn thu hồi (khách → kho) nếu đơn
                gốc có địa chỉ GHN. Không có đơn liên kết hoặc GHN lỗi → dùng mã mặc định GHTK-{"{ticket}"}.
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Đơn vị VC</InputLabel>
                  <Select
                    label="Đơn vị VC"
                    value={returnCarrier}
                    onChange={(e) => setReturnCarrier(e.target.value)}
                  >
                    {RETURN_CARRIERS.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Mã vận đơn thu hồi"
                  placeholder="Để trống: GHN tự tạo (nếu chọn GHN + có đơn gốc), hoặc GHTK-{mã ticket}"
                  value={returnTrackingCode}
                  onChange={(e) => setReturnTrackingCode(e.target.value)}
                />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                disabled={saving || !sys?.imeiMatch || !sys?.warrantyValid}
                onClick={handleApprove}
              >
                Duyệt thu hồi hàng
              </Button>
              <TextField
                size="small"
                placeholder="Lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                sx={{ minWidth: 240, flex: 1 }}
              />
              <Button
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                disabled={saving}
                onClick={handleReject}
              >
                Từ chối
              </Button>
            </Box>
          </Paper>
        )}

        {claim.status === "APPROVED" && hasAnyPermission(["WARRANTY_MANAGE", "STOCK_IMPORT", "IMEI_MANAGE", "ADMIN"]) && (
          <Paper sx={{ p: 2, mb: 3, border: "1px dashed #94a3b8" }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Kho xác nhận đã nhận máy lỗi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tra cứu trước khi bấm: mã vận đơn{" "}
              <strong>{claim.returnTrackingCode || "—"}</strong> hoặc ticket{" "}
              <strong>#{claim.claimNumber}</strong>
            </Typography>
            <Button
              variant="outlined"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await markWarrantyClaimReceived(id);
                  if (isApiSuccess(res)) {
                    toast.success("Đã xác nhận nhận máy tại kho");
                    setClaim(res.data);
                  }
                } catch (err) {
                  toast.error(err.response?.data?.message || "Lỗi");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Xác nhận nhận máy (RECEIVED)
            </Button>
          </Paper>
        )}

        {/* Tech inspection — RECEIVED */}
        {claim.status === "RECEIVED" && hasAnyPermission(["WARRANTY_MANAGE", "ADMIN", "ROLE_ADMIN"]) && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Biên bản kỹ thuật (Kho / KTV)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder='VD: "Lỗi chết nguồn do NSX, đủ điều kiện đổi mới"'
              value={inspectionText}
              onChange={(e) => setInspectionText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" disabled={saving} onClick={handleInspection}>
              Lưu biên bản → Chuyển Sales phán quyết
            </Button>
          </Paper>
        )}

        {/* Màn hình 3 — INSPECTING */}
        {showResolution && canManage && (
          <Paper sx={{ p: 3, mb: 3, border: "2px solid #8b5cf6" }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Bước 2 — Phán quyết cuối (Sales)
            </Typography>
            {claim.inspectionResult && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>Biên bản KTV:</strong> {claim.inspectionResult}
              </Alert>
            )}
            <RadioGroup value={resolution} onChange={(e) => setResolution(e.target.value)}>
              {RESOLUTION_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio />}
                  label={opt.label}
                />
              ))}
            </RadioGroup>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Ghi chú phán quyết"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              sx={{ mt: 2, mb: 2 }}
            />
            <Button variant="contained" color="primary" disabled={saving} onClick={handleResolve}>
              Hoàn tất phán quyết
            </Button>
            {claim.replacementOrderCode && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Đơn thay thế 0đ (stub): <strong>{claim.replacementOrderCode}</strong>
              </Alert>
            )}
          </Paper>
        )}

        {showClose && canManage && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Đóng ticket sau khi sửa xong
            </Typography>
            <Button variant="contained" color="success" disabled={saving} onClick={handleClose}>
              Hoàn tất Ticket (Close)
            </Button>
          </Paper>
        )}

        {["COMPLETED", "REJECTED"].includes(claim.status) && (
          <Alert severity={claim.status === "REJECTED" ? "warning" : "success"} sx={{ mt: 2 }}>
            Ticket đã kết thúc — {CLAIM_STATUS_LABELS[claim.status]}
            {claim.finalResolutionDisplay && ` · ${claim.finalResolutionDisplay}`}
          </Alert>
        )}
      </Box>
    </AdminLayout>
  );
};

export default SalesWarrantyClaimDetailPage;
