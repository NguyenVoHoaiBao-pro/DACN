/**
 * Màn 2 — Chi tiết hoàn tiền (/admin/refunds/:id)
 * Sales: nhập STK (COD) | Admin: VNPay API + xác nhận COD + phiếu chi
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Grid, List, ListItem,
  ListItemText, Paper, TextField, Typography,
} from "@mui/material";
import {
  ArrowBack as BackIcon, AccountBalance as BankIcon, CloudUpload as UploadIcon,
  Payments as VnpayIcon, Print as PrintIcon, Replay as RetryIcon, Save as SaveIcon,
  Search as SearchIcon, AccountBalanceWallet as WalletIcon, History as HistoryIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { API_BASE_URL } from "../../config/api";
import {
  approveRefundGateway, checkRefundGatewayBalance, confirmCodRefund, fetchRefundAuditLogs,
  fetchRefundDetail, napasLookup, paymentMethodTag, retryRefundGateway, updateRefundBankInfo,
} from "../../services/refundService";
import { usePermissions } from "../../hooks/usePermissions";
import { getApiErrorMessage, isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const formatMoney = (v) => (v != null ? `${Number(v).toLocaleString("vi-VN")} ₫` : "—");

const RefundProcessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { hasPermission, isAdminUser } = usePermissions();
  const canApprove = hasPermission("REFUND_APPROVE") || isAdminUser;
  const canEditBank = hasPermission("REFUND_BANK_INFO") || canApprove;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankNotes, setBankNotes] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [lookupMsg, setLookupMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [res, auditRes] = await Promise.all([
        fetchRefundDetail(id),
        fetchRefundAuditLogs(id).catch(() => null),
      ]);
      if (isApiSuccess(res)) {
        setDetail(res.data);
        setBankName(res.data.customerBankName || "");
        setBankAccount(res.data.customerBankAccount || "");
        setBankAccountName(res.data.customerBankAccountName || "");
      }
      if (auditRes && isApiSuccess(auditRes)) {
        setAuditLogs(auditRes.data || []);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được chi tiết."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const isGateway = detail?.refundChannel === "GATEWAY";
  const isCod = detail?.refundChannel === "COD_MANUAL"
    || detail?.refundChannel === "BANK_TRANSFER_MANUAL";
  const canProcess = detail?.status === "PENDING_APPROVAL";
  const isVnpay = detail?.paymentMethod === "VNPAY";

  const handleNapasLookup = async () => {
    if (!bankName.trim() || !bankAccount.trim()) {
      toast.warning("Nhập ngân hàng và STK trước khi tra cứu Napas.");
      return;
    }
    setActing(true);
    try {
      const res = await napasLookup(bankName.trim(), bankAccount.trim());
      if (isApiSuccess(res) && res.data.verified) {
        setBankAccountName(res.data.accountHolderName || "");
        setLookupMsg(res.data.message || "Tra cứu thành công.");
        toast.success("Napas: đã điền tên chủ tài khoản.");
      } else {
        setLookupMsg(res.data?.message || "Không tra cứu được.");
        toast.warning(res.data?.message || "Tra cứu Napas thất bại.");
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Tra cứu Napas thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleCheckBalance = async () => {
    setActing(true);
    try {
      const res = await checkRefundGatewayBalance(id);
      if (isApiSuccess(res)) {
        setBalanceInfo(res.data);
        toast[res.data.sufficient ? "success" : "warning"](res.data.message);
        const auditRes = await fetchRefundAuditLogs(id);
        if (isApiSuccess(auditRes)) setAuditLogs(auditRes.data || []);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Kiểm tra số dư thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleSaveBankInfo = async () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountName.trim()) {
      toast.warning("Vui lòng nhập đầy đủ thông tin ngân hàng.");
      return;
    }
    setActing(true);
    try {
      const res = await updateRefundBankInfo(id, {
        customerBankName: bankName.trim(),
        customerBankAccount: bankAccount.trim(),
        customerBankAccountName: bankAccountName.trim(),
        notes: bankNotes.trim() || undefined,
      });
      if (isApiSuccess(res)) {
        toast.success("Đã lưu STK khách — chờ Admin xác nhận chuyển khoản.");
        setDetail(res.data);
        const auditRes = await fetchRefundAuditLogs(id);
        if (isApiSuccess(auditRes)) setAuditLogs(auditRes.data || []);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Lưu thông tin ngân hàng thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleGatewayRefund = async () => {
    setActing(true);
    try {
      const res = await approveRefundGateway(id, {});
      if (isApiSuccess(res)) {
        if (res.data.status === "COMPLETED") {
          toast.success("Hoàn tiền cổng thành công — đơn đã REFUNDED.");
        } else {
          toast.error(res.data.failureReason || "Hoàn tiền thất bại.");
        }
        setDetail(res.data);
        const auditRes = await fetchRefundAuditLogs(id);
        if (isApiSuccess(auditRes)) setAuditLogs(auditRes.data || []);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gọi API hoàn tiền thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleCodConfirm = async () => {
    if (!receiptFile) {
      toast.warning("Vui lòng tải lên ảnh biên lai chuyển khoản.");
      return;
    }
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountName.trim()) {
      toast.warning("Thiếu thông tin ngân hàng khách.");
      return;
    }
    setActing(true);
    try {
      const fd = new FormData();
      fd.append("customerBankName", bankName.trim());
      fd.append("customerBankAccount", bankAccount.trim());
      fd.append("customerBankAccountName", bankAccountName.trim());
      if (transferRef.trim()) fd.append("transferReference", transferRef.trim());
      fd.append("receipt", receiptFile);
      const res = await confirmCodRefund(id, fd);
      if (isApiSuccess(res)) {
        toast.success(`Đã chuyển khoản & sinh phiếu chi ${res.data.voucherCode}`);
        setDetail(res.data);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xác nhận COD thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setReceiptFile(f);
    setReceiptPreview(URL.createObjectURL(f));
  };

  if (loading) {
    return (
      <AdminLayout currentPage="Quản lý hoàn tiền">
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout currentPage="Quản lý hoàn tiền">
        <Alert severity="error" sx={{ m: 3 }}>Không tìm thấy yêu cầu hoàn tiền.</Alert>
      </AdminLayout>
    );
  }

  const gatewayButtonLabel = isVnpay
    ? "Hoàn tiền qua VNPay"
    : `Hoàn tiền qua ${detail.paymentMethodLabel}`;

  const bankFieldsReadOnly = !canEditBank || (!canProcess && detail.status !== "PENDING_APPROVAL");

  return (
    <AdminLayout currentPage="Quản lý hoàn tiền">
      <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate("/admin/refunds")} sx={{ mb: 2 }}>
          Danh sách hoàn tiền
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Typography variant="h5" fontWeight="bold">{detail.refundCode}</Typography>
          <Chip label={detail.statusLabel} color={detail.status === "COMPLETED" ? "success" : "warning"} />
          <Chip label={paymentMethodTag(detail.paymentMethod)} variant="outlined" />
        </Box>

        {!canApprove && canProcess && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Bạn đang ở vai trò <strong>Sales</strong>: nhập STK khách (đơn COD) rồi báo Admin duyệt chuyển khoản.
            Đơn VNPay/MoMo chỉ Admin mới được hoàn qua cổng.
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Thông tin chung</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">Phiếu kho / BH</Typography>
              <Typography fontWeight={600}>
                {detail.returnSlipCode || detail.warrantyClaimCode || "—"}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">Đơn hàng</Typography>
              <Typography fontWeight={600}>{detail.orderCode}</Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">Khách hàng</Typography>
              <Typography fontWeight={600}>{detail.customerName}</Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">Phân loại kho</Typography>
              <Typography fontWeight={600}>
                {detail.defectiveReasonLabel || (detail.isDefective ? "Hàng lỗi" : "Hàng tốt")}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">Số tiền hoàn</Typography>
              <Typography fontWeight={700} color="error.main">{formatMoney(detail.refundAmount)}</Typography>
            </Grid>
            {detail.couponAllocatedDiscount > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Đã trừ coupon phân bổ: {formatMoney(detail.couponAllocatedDiscount)}
                  {detail.shippingExcludedAmount > 0
                    && ` · Không hoàn phí ship: ${formatMoney(detail.shippingExcludedAmount)}`}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* NHÁNH A: Cổng thanh toán */}
        {isGateway && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: "2px solid #3b82f6" }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <VnpayIcon color="primary" /> Hoàn tiền tự động qua cổng
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Mã GD gốc</Typography>
                <Typography fontWeight={600} sx={{ fontFamily: "monospace" }}>
                  {detail.originalGatewayTransactionId || "—"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Số tiền thanh toán ban đầu</Typography>
                <Typography fontWeight={600}>{formatMoney(detail.originalPaymentAmount)}</Typography>
              </Grid>
            </Grid>

            {canProcess && canApprove && (
              <>
                <Button variant="outlined" color="info" startIcon={<WalletIcon />}
                  disabled={acting} onClick={handleCheckBalance} sx={{ mb: 2 }}>
                  Kiểm tra số dư cổng
                </Button>
                {balanceInfo && (
                  <Alert severity={balanceInfo.sufficient ? "success" : "error"} sx={{ mb: 2 }}>
                    {balanceInfo.message}
                    <br />
                    Số dư ví: {formatMoney(balanceInfo.merchantBalance)} · Cần hoàn: {formatMoney(balanceInfo.requiredAmount)}
                  </Alert>
                )}
                <Button variant="contained" color="primary" size="large" fullWidth
                  disabled={acting} onClick={handleGatewayRefund} sx={{ py: 1.5, fontWeight: 700 }}>
                  {acting ? <CircularProgress size={24} color="inherit" />
                    : `Xác nhận hoàn tiền qua cổng (${detail.paymentMethodLabel})`}
                </Button>
              </>
            )}
            {canProcess && !canApprove && (
              <Alert severity="warning">Chờ Admin duyệt hoàn tiền qua {detail.paymentMethodLabel}.</Alert>
            )}
            {detail.status === "FAILED" && canApprove && (
              <Button variant="contained" color="warning" startIcon={<RetryIcon />} sx={{ mt: 2 }}
                disabled={acting} onClick={async () => {
                  setActing(true);
                  try {
                    const res = await retryRefundGateway(id);
                    if (isApiSuccess(res)) {
                      setDetail(res.data);
                      const auditRes = await fetchRefundAuditLogs(id);
                      if (isApiSuccess(auditRes)) setAuditLogs(auditRes.data || []);
                    }
                  } finally { setActing(false); }
                }}>
                Thử lại gọi API hoàn tiền
              </Button>
            )}
            {detail.failureReason && <Alert severity="error" sx={{ mt: 2 }}>{detail.failureReason}</Alert>}
          </Paper>
        )}

        {/* NHÁNH B: COD — Sales nhập STK, Admin xác nhận + biên lai */}
        {isCod && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: "2px solid #f59e0b" }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <BankIcon color="warning" /> Chuyển khoản thủ công (COD)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {canApprove
                ? "Kiểm tra STK (Sales có thể đã nhập), chuyển tiền qua app ngân hàng, tải biên lai và xác nhận."
                : "Thu thập STK từ khách (điện thoại/Zalo) và lưu — Admin sẽ chuyển khoản và xác nhận."}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Tên ngân hàng" placeholder="Vietcombank"
                  value={bankName} onChange={(e) => setBankName(e.target.value)}
                  disabled={bankFieldsReadOnly} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Số tài khoản" placeholder="1023456789"
                  value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}
                  disabled={bankFieldsReadOnly} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Tên chủ tài khoản" placeholder="NGUYEN VAN A"
                  value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)}
                  disabled={bankFieldsReadOnly} required />
              </Grid>
              {canEditBank && canProcess && !canApprove && (
                <Grid item xs={12}>
                  <Button variant="outlined" startIcon={<SearchIcon />}
                    disabled={acting} onClick={handleNapasLookup} sx={{ mr: 2 }}>
                    Tra cứu Napas (tên chủ TK)
                  </Button>
                  {lookupMsg && (
                    <Typography variant="caption" color="text.secondary">{lookupMsg}</Typography>
                  )}
                </Grid>
              )}
              {canEditBank && canProcess && !canApprove && (
                <Grid item xs={12}>
                  <TextField fullWidth label="Ghi chú (tùy chọn)" placeholder="Khách gọi lúc 14h..."
                    value={bankNotes} onChange={(e) => setBankNotes(e.target.value)} />
                </Grid>
              )}
            </Grid>

            {canEditBank && canProcess && !canApprove && (
              <Button variant="contained" color="warning" startIcon={<SaveIcon />}
                disabled={acting} onClick={handleSaveBankInfo} sx={{ mb: 2 }}>
                {acting ? <CircularProgress size={22} color="inherit" /> : "Lưu thông tin ngân hàng"}
              </Button>
            )}

            {detail.vietQrUrl && canApprove && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Mã VietQR chuyển khoản</Typography>
                <Box component="img" src={detail.vietQrUrl} alt="VietQR"
                  sx={{ maxWidth: 220, borderRadius: 2, border: "1px solid #e2e8f0" }} />
              </Box>
            )}

            {canApprove && canProcess && (
              <>
                <Divider sx={{ my: 2 }} />
                <TextField fullWidth sx={{ mb: 2 }} label="Mã giao dịch ngân hàng (tùy chọn)"
                  value={transferRef} onChange={(e) => setTransferRef(e.target.value)} />
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                <Box sx={{ mb: 2 }}>
                  <Button variant="outlined" startIcon={<UploadIcon />}
                    onClick={() => fileRef.current?.click()}>
                    Tải lên biên lai chuyển khoản
                  </Button>
                  {receiptFile && (
                    <Typography variant="body2" sx={{ mt: 1 }}>Đã chọn: {receiptFile.name}</Typography>
                  )}
                  {receiptPreview && (
                    <Box component="img" src={receiptPreview} alt="Biên lai"
                      sx={{ mt: 2, maxWidth: 280, maxHeight: 200, borderRadius: 2, border: "1px solid #e2e8f0" }} />
                  )}
                </Box>
                <Button variant="contained" color="success" size="large" fullWidth
                  disabled={acting} onClick={handleCodConfirm} sx={{ py: 1.5, fontWeight: 700 }}>
                  {acting ? <CircularProgress size={24} color="inherit" />
                    : "Xác nhận đã chuyển khoản & Sinh phiếu chi"}
                </Button>
              </>
            )}
          </Paper>
        )}

        {detail.status === "COMPLETED" && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Đã hoàn tiền thành công
            {detail.completedAt && ` — ${new Date(detail.completedAt).toLocaleString("vi-VN")}`}.
            {detail.voucherCode && (
              <> Phiếu chi: <strong>{detail.voucherCode}</strong></>
            )}
          </Alert>
        )}

        {detail.voucherCode && (
          <Button variant="outlined" startIcon={<PrintIcon />}
            onClick={() => navigate(`/admin/refunds/${id}/voucher`)}>
            Xem / In phiếu chi
          </Button>
        )}

        {detail.receiptImageUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Biên lai đính kèm</Typography>
            <Box component="img"
              src={`${API_BASE_URL}${detail.receiptImageUrl}`}
              alt="Biên lai"
              sx={{ maxWidth: 320, borderRadius: 2, border: "1px solid #e2e8f0" }} />
          </Box>
        )}

        {auditLogs.length > 0 && (
          <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <HistoryIcon /> Nhật ký kiểm toán (Audit Log)
            </Typography>
            <List dense>
              {auditLogs.map((log) => (
                <ListItem key={log.id} alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={`${log.actionLabel} — ${log.actorUsername}`}
                    secondary={
                      <>
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                        {log.detail ? ` · ${log.detail}` : ""}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </AdminLayout>
  );
};

export default RefundProcessPage;
