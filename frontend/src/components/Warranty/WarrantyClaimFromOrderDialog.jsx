import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Build as RepairIcon } from "@mui/icons-material";
import { selectUser } from "../../redux/appSlice";
import { checkWarranty, submitWarrantyClaim } from "../../services/warrantyService";
import { isApiSuccess } from "../../utils/apiResponse";
import { formatDate } from "../../utils/formatters";
import { useGHNShipping } from "../../hooks/useGHNShipping";
import { resolveGhnFromOrderContext } from "../../utils/warrantyFromOrder";

const WARRANTY_STATUS_LABELS = {
  AVAILABLE: "Còn hàng",
  RESERVED: "Đã đặt cọc",
  SOLD: "Đã bán",
  IN_REPAIR: "Đang sửa chữa",
  RETURNED: "Đã trả khách",
  DEFECTIVE: "Lỗi NSX",
};

/**
 * Gửi yêu cầu BH từ Đơn hàng của tôi — tự tra cứu BH, điền liên hệ & địa chỉ lấy hàng GHN.
 */
const WarrantyClaimFromOrderDialog = ({ open, onClose, context }) => {
  const user = useSelector(selectUser);
  const {
    provinces,
    districts,
    wards,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    loadingDistricts,
    loadingWards,
    onProvinceChange,
    onDistrictChange,
    onWardChange,
    resetShipping,
  } = useGHNShipping(0);

  const [form, setForm] = useState({
    submittedImei: "",
    issueDescription: "",
    issueType: "NOT_WORKING",
    customerRequest: "REPAIR",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactAddress: "",
    imageUrl1: "",
    videoUrl: "",
  });
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantyError, setWarrantyError] = useState("");
  const [addressPrefillNote, setAddressPrefillNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successClaim, setSuccessClaim] = useState(null);
  const prefillDoneRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prefillDoneRef.current = false;
      return;
    }
    if (!context) return;

    setError("");
    setSuccessClaim(null);
    setWarrantyInfo(null);
    setWarrantyError("");
    setAddressPrefillNote("");
    resetShipping();
    prefillDoneRef.current = false;

    setForm({
      submittedImei: context.imei || "",
      issueDescription: "",
      issueType: "NOT_WORKING",
      customerRequest: "REPAIR",
      contactName: context.shippingName || user?.name || user?.fullName || "",
      contactPhone: context.shippingPhone || user?.phone || "",
      contactEmail: user?.email || "",
      contactAddress: context.shippingAddress || "",
      imageUrl1: "",
      videoUrl: "",
    });

    const imei = (context.imei || "").trim();
    if (!imei) return;

    let cancelled = false;
    setWarrantyLoading(true);
    checkWarranty(imei)
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setWarrantyInfo(json.data);
        } else {
          setWarrantyError(json.message || "Không tra cứu được thông tin bảo hành.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setWarrantyError(
            err.response?.data?.message || "Không tra cứu được thông tin bảo hành."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setWarrantyLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context, user]);

  useEffect(() => {
    if (!open || !context || prefillDoneRef.current || provinces.length === 0) return;

    let cancelled = false;
    prefillDoneRef.current = true;

    (async () => {
      try {
        const ghn = await resolveGhnFromOrderContext(context, provinces);
        if (cancelled) return;
        if (ghn.province) {
          await onProvinceChange(ghn.province.id, ghn.province.name);
          if (ghn.district) {
            await onDistrictChange(ghn.district.id, ghn.district.name);
            if (ghn.ward) {
              await onWardChange(ghn.ward.code, ghn.ward.name);
            } else {
              setAddressPrefillNote("Chưa khớp phường/xã — vui lòng chọn lại.");
            }
          } else {
            setAddressPrefillNote("Chưa khớp quận/huyện — vui lòng chọn lại.");
          }
        } else if (context.shippingProvince) {
          setAddressPrefillNote("Chưa khớp tỉnh/thành — vui lòng chọn lại địa chỉ lấy hàng.");
        }
      } catch {
        if (!cancelled) {
          setAddressPrefillNote("Không tải được địa chỉ GHN — vui lòng chọn thủ công.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context, provinces.length]);

  const validatePickup = () => {
    if (!form.submittedImei?.trim()) return "Thiếu IMEI/Serial máy cần bảo hành.";
    if (!form.issueDescription?.trim()) return "Vui lòng mô tả lỗi.";
    if (!form.contactName?.trim()) return "Vui lòng nhập họ tên người nhận shipper.";
    if (!form.contactPhone?.trim()) return "Vui lòng nhập số điện thoại liên hệ.";
    if (!selectedProvince) return "Vui lòng chọn Tỉnh/Thành phố lấy hàng.";
    if (!selectedDistrict) return "Vui lòng chọn Quận/Huyện lấy hàng.";
    if (!selectedWard) return "Vui lòng chọn Phường/Xã lấy hàng.";
    if (!form.contactAddress?.trim()) return "Vui lòng nhập số nhà, tên đường lấy hàng.";
    return null;
  };

  const formatPickupPreview = () => {
    if (!selectedProvince) return null;
    return [
      form.contactAddress.trim(),
      selectedWard?.name,
      selectedDistrict?.name,
      selectedProvince?.name,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const handleSubmit = async () => {
    const validationError = validatePickup();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await submitWarrantyClaim({
        submittedImei: form.submittedImei.trim(),
        orderId: context.orderId,
        orderDetailId: context.orderDetailId,
        issueDescription: form.issueDescription.trim(),
        issueType: form.issueType,
        customerRequest: form.customerRequest,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail,
        contactAddress: form.contactAddress.trim(),
        contactProvince: selectedProvince.name,
        contactDistrict: selectedDistrict.name,
        contactWard: selectedWard.name,
        pickupToDistrictId: selectedDistrict.id,
        pickupToWardCode: String(selectedWard.code),
        imageUrl1: form.imageUrl1 || undefined,
        videoUrl: form.videoUrl || undefined,
      });
      if (isApiSuccess(res)) {
        setSuccessClaim(res.data?.claimNumber || "OK");
      } else {
        setError(res.message || "Gửi thất bại");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const renderWarrantyBadge = () => {
    if (!warrantyInfo) return null;
    if (
      warrantyInfo.warrantyStartDate === null &&
      warrantyInfo.warrantyEndDate === null &&
      warrantyInfo.valid
    ) {
      return <Chip size="small" label="Chưa kích hoạt BH" color="warning" />;
    }
    return (
      <Chip
        size="small"
        label={warrantyInfo.valid ? "Còn bảo hành" : "Hết bảo hành"}
        color={warrantyInfo.valid ? "success" : "error"}
      />
    );
  };

  if (!context) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <RepairIcon color="primary" />
        Yêu cầu bảo hành / Sửa chữa
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Đơn <strong>#{context.orderCode}</strong>
          {context.variantName ? ` · ${context.variantName}` : ` · ${context.productName}`}
        </Alert>

        {successClaim ? (
          <Alert severity="success">
            Đã tạo ticket <strong>#{successClaim}</strong>. Sales sẽ liên hệ bạn trong 24–48 giờ.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Thông tin bảo hành tự tra cứu */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: warrantyInfo?.valid ? "success.light" : "divider",
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Thông tin bảo hành
              </Typography>
              {warrantyLoading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2">Đang tra cứu IMEI...</Typography>
                </Box>
              )}
              {!warrantyLoading && warrantyError && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  {warrantyError}
                </Alert>
              )}
              {!warrantyLoading && warrantyInfo && (
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {warrantyInfo.imageUrl ? (
                    <Avatar
                      src={warrantyInfo.imageUrl}
                      variant="rounded"
                      sx={{ width: 64, height: 64 }}
                    />
                  ) : (
                    <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: "grey.300" }}>
                      📱
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {warrantyInfo.productName}
                    </Typography>
                    {warrantyInfo.variantName && (
                      <Typography variant="body2" color="text.secondary">
                        {warrantyInfo.variantName}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                      {renderWarrantyBadge()}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          WARRANTY_STATUS_LABELS[warrantyInfo.status] || warrantyInfo.status
                        }
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      IMEI: <strong>{warrantyInfo.imei || form.submittedImei}</strong>
                    </Typography>
                    {warrantyInfo.warrantyStartDate ? (
                      <Typography variant="body2" color="text.secondary">
                        BH: {formatDate(warrantyInfo.warrantyStartDate)} →{" "}
                        {warrantyInfo.warrantyEndDate
                          ? formatDate(warrantyInfo.warrantyEndDate)
                          : "N/A"}{" "}
                        ({warrantyInfo.warrantyMonths} tháng)
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Thời hạn: {warrantyInfo.warrantyMonths} tháng — kích hoạt khi giao máy
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Thiết bị &amp; lỗi
            </Typography>
            <TextField
              label="IMEI / Serial máy cần bảo hành"
              required
              fullWidth
              size="small"
              value={form.submittedImei}
              onChange={(e) => setForm({ ...form, submittedImei: e.target.value })}
              helperText="Lấy từ đơn hàng — có thể sửa nếu nhập nhầm"
            />
            <TextField
              label="Mô tả lỗi"
              required
              fullWidth
              multiline
              rows={3}
              value={form.issueDescription}
              onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
              placeholder='VD: "Máy tự sập nguồn khi sạc"'
            />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                select
                label="Loại sự cố"
                size="small"
                sx={{ flex: 1, minWidth: 180 }}
                value={form.issueType}
                onChange={(e) => setForm({ ...form, issueType: e.target.value })}
              >
                <MenuItem value="NOT_WORKING">Không hoạt động</MenuItem>
                <MenuItem value="DEFECTIVE">Lỗi kỹ thuật</MenuItem>
                <MenuItem value="DAMAGED">Hư hỏng vật lý</MenuItem>
                <MenuItem value="MISSING_PARTS">Thiếu phụ kiện</MenuItem>
                <MenuItem value="OTHER">Khác</MenuItem>
              </TextField>
              <TextField
                select
                label="Yêu cầu xử lý"
                size="small"
                sx={{ flex: 1, minWidth: 180 }}
                value={form.customerRequest}
                onChange={(e) => setForm({ ...form, customerRequest: e.target.value })}
              >
                <MenuItem value="REPAIR">Sửa chữa</MenuItem>
                <MenuItem value="REPLACE">Đổi máy mới</MenuItem>
                <MenuItem value="REFUND">Hoàn tiền</MenuItem>
              </TextField>
            </Box>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Liên hệ &amp; địa chỉ lấy hàng
            </Typography>
            {addressPrefillNote && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                {addressPrefillNote}
              </Alert>
            )}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label="Họ tên người nhận shipper"
                required
                fullWidth
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
              <TextField
                label="Số điện thoại"
                required
                fullWidth
                size="small"
                sx={{ flex: 1, minWidth: 160 }}
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="0901234567"
              />
            </Box>
            <TextField
              label="Email"
              fullWidth
              size="small"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
            <TextField
              select
              label="Tỉnh / Thành phố"
              required
              fullWidth
              size="small"
              value={selectedProvince?.id || ""}
              onChange={(e) => {
                const prov = provinces.find((p) => String(p.provinceId) === e.target.value);
                onProvinceChange(prov?.provinceId || null, prov?.provinceName || "");
              }}
            >
              <MenuItem value="">-- Chọn tỉnh/thành --</MenuItem>
              {provinces.map((p) => (
                <MenuItem key={p.provinceId} value={p.provinceId}>
                  {p.provinceName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Quận / Huyện"
              required
              fullWidth
              size="small"
              disabled={!selectedProvince || loadingDistricts}
              value={selectedDistrict?.id || ""}
              onChange={(e) => {
                const dist = districts.find((d) => String(d.districtId) === e.target.value);
                onDistrictChange(dist?.districtId || null, dist?.districtName || "");
              }}
            >
              <MenuItem value="">
                {loadingDistricts ? "Đang tải..." : "-- Chọn quận/huyện --"}
              </MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.districtId} value={d.districtId}>
                  {d.districtName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Phường / Xã"
              required
              fullWidth
              size="small"
              disabled={!selectedDistrict || loadingWards}
              value={selectedWard?.code || ""}
              onChange={(e) => {
                const ward = wards.find((w) => String(w.wardCode) === e.target.value);
                onWardChange(ward?.wardCode || null, ward?.wardName || "");
              }}
            >
              <MenuItem value="">
                {loadingWards ? "Đang tải..." : "-- Chọn phường/xã --"}
              </MenuItem>
              {wards.map((w) => (
                <MenuItem key={w.wardCode} value={w.wardCode}>
                  {w.wardName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Số nhà, tên đường"
              required
              fullWidth
              size="small"
              value={form.contactAddress}
              onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
              placeholder="VD: 15 Lê Văn Sỹ"
            />
            {formatPickupPreview() && (
              <Typography variant="body2" color="text.secondary">
                <strong>Địa chỉ lấy hàng:</strong> {formatPickupPreview()}
              </Typography>
            )}

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Minh chứng (tuỳ chọn)
            </Typography>
            <TextField
              label="Link ảnh hóa đơn / vỏ hộp"
              fullWidth
              size="small"
              value={form.imageUrl1}
              onChange={(e) => setForm({ ...form, imageUrl1: e.target.value })}
            />
            <TextField
              label="Link video quay lỗi"
              fullWidth
              size="small"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />

            {error && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{successClaim ? "Đóng" : "Hủy"}</Button>
        {!successClaim && (
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WarrantyClaimFromOrderDialog;
