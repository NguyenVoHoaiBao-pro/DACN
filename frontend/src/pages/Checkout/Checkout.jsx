import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import EditNoteIcon from "@mui/icons-material/EditNote";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LockIcon from "@mui/icons-material/Lock";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import WalletIcon from "@mui/icons-material/Wallet";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { selectIsLoggedIn } from "../../redux/appSlice";
import { fetchCart } from "../../services/cartService";
import {
  checkout,
  previewCoupon,
} from "../../services/orderService";
import { formatMoney } from "../../utils/formatters";
import { useGHNShipping } from "../../hooks/useGHNShipping";
import CouponSelector from "./CouponSelector";


// ─── Styles ──────────────────────────────────────────────────────────────────
const cardSx = {
  width: "100%",
  border: "1px solid #e0e0e0",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  borderRadius: 2,
};

const selectSx = {
  "& .MuiOutlinedInput-root": {
    "&.Mui-focused fieldset": { borderColor: "#f28900" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#f28900" },
};

// ─── Component phí ship ───────────────────────────────────────────────────────
const ShippingInfoBox = ({ shippingInfo, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
        <CircularProgress size={16} sx={{ color: "#f28900" }} />
        <Typography variant="body2" color="text.secondary">
          Đang tính phí vận chuyển...
        </Typography>
      </Box>
    );
  }

  if (!shippingInfo) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: "italic" }}>
        Chọn địa chỉ để xem phí ship
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        bgcolor: shippingInfo.freeShipping ? "#e8f5e9" : "#fff8ef",
        border: `1px solid ${shippingInfo.freeShipping ? "#c8e6c9" : "#ffe0b2"}`,
        borderRadius: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalShippingOutlinedIcon
          sx={{ fontSize: 16, color: shippingInfo.freeShipping ? "#2e7d32" : "#f28900" }}
        />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {shippingInfo.serviceName || "GHN Express"}
        </Typography>
        {shippingInfo.freeShipping && (
          <Chip
            label="🎁 MIỄN PHÍ"
            size="small"
            sx={{ bgcolor: "#2e7d32", color: "#fff", fontSize: "0.7rem", height: 20 }}
          />
        )}
      </Box>

      {!shippingInfo.freeShipping && (
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#f28900" }}>
          {shippingInfo.shippingFeeFormatted}
        </Typography>
      )}

      {shippingInfo.freeShipping && shippingInfo.freeShippingReason && (
        <Typography variant="caption" sx={{ color: "#4caf50" }}>
          {shippingInfo.freeShippingReason}
        </Typography>
      )}

      {shippingInfo.estimatedDeliveryDisplay && (
        <Typography variant="caption" color="text.secondary">
          📅 {shippingInfo.estimatedDeliveryDisplay}
        </Typography>
      )}
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Checkout = () => {
  const navigate = useNavigate();
  const isLoggedIn = useSelector(selectIsLoggedIn);

  // ─── State ───
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Địa chỉ giao hàng
  const [formData, setFormData] = useState({
    shippingName: "",
    shippingPhone: "",
    shippingAddress: "",
  });

  // Thanh toán
  const [paymentMethod, setPaymentMethod] = useState("COD");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Ghi chú
  const [note, setNote] = useState("");

  // Errors & Snackbar
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ─── Tính subtotal trước để truyền vào hook ───
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0),
    0
  );

  // ─── GHN Shipping Hook ───
  const {
    provinces,
    districts,
    wards,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    shippingInfo,
    loadingShipping,
    loadingDistricts,
    loadingWards,
    onProvinceChange,
    onDistrictChange,
    onWardChange,
    resetShipping,
  } = useGHNShipping(subtotal);

  // ─── Load cart ───
  const loadData = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    try {
      const cartData = await fetchCart();
      setCartItems(cartData?.items || []);
    } catch (err) {
      console.error("Lỗi load checkout data:", err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Tính toán phí & tổng ───
  const discountAmount = couponResult?.discountAmount || 0;

  // Phí ship từ GHN
  const effectiveShippingFee = shippingInfo?.freeShipping
    ? 0
    : shippingInfo?.shippingFee ?? 0;
  const totalAmount = subtotal - discountAmount + effectiveShippingFee;

  // ─── Handlers địa chỉ mới ───
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ─── Validate ───
  const validate = () => {
    const tempErrors = {};
    if (!formData.shippingName.trim())
      tempErrors.shippingName = "Vui lòng nhập họ tên người nhận";
    if (!formData.shippingPhone.trim())
      tempErrors.shippingPhone = "Vui lòng nhập số điện thoại";
    else if (!/^[0-9]{9,12}$/.test(formData.shippingPhone.trim()))
      tempErrors.shippingPhone = "Số điện thoại không hợp lệ (9-12 chữ số)";
    if (!formData.shippingAddress.trim())
      tempErrors.shippingAddress = "Vui lòng nhập địa chỉ chi tiết";
    // GHN: phải chọn đủ tỉnh/quận/phường để có phí chính xác
    if (!selectedProvince)
      tempErrors.province = "Vui lòng chọn tỉnh/thành phố";
    if (!selectedDistrict)
      tempErrors.district = "Vui lòng chọn quận/huyện";
    if (!selectedWard)
      tempErrors.ward = "Vui lòng chọn phường/xã";
    if (!paymentMethod)
      tempErrors.paymentMethod = "Vui lòng chọn phương thức thanh toán";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // ─── Preview coupon ───
  const handlePreviewCoupon = async (passedCode) => {
    const codeToUse = passedCode || couponCode.trim();
    if (!codeToUse) return;
    
    if (passedCode) setCouponCode(passedCode.toUpperCase());
    
    setCouponLoading(true);

    setCouponError("");
    setCouponResult(null);
    try {
      const result = await previewCoupon(codeToUse);
      setCouponResult(result);
    } catch (err) {

      setCouponError(err.response?.data?.message || "Mã giảm giá không hợp lệ");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
  };

  // ─── Submit checkout ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const request = {
        paymentMethod,
        note: note.trim() || undefined,
        couponCode: couponResult ? couponCode.trim() : undefined,
      };

      request.shippingName = formData.shippingName.trim();
      request.shippingPhone = formData.shippingPhone.trim();
      request.shippingAddress = formData.shippingAddress.trim();
      request.shippingProvince = selectedProvince?.name || undefined;
      request.shippingDistrict = selectedDistrict?.name || undefined;
      request.shippingWard = selectedWard?.name || undefined;

      // GHN IDs bắt buộc để tính phí chính xác
      if (selectedDistrict && selectedWard) {
        request.toDistrictId = selectedDistrict.id;     // integer
        request.toWardCode = selectedWard.code;       // String!
      }

      const order = await checkout(request);

      // Redirect đến cổng thanh toán nếu VNPAY/MOMO/ZALOPAY
      if (order?.paymentUrl) {
        window.location.href = order.paymentUrl;
        return;
      }

      setSnackbar({
        open: true,
        message: "Đặt hàng thành công! 🎉",
        severity: "success",
      });
      setTimeout(() => navigate("/user/orders"), 1500);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message;
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setSnackbar({
        open: true,
        message: errMsg || "Đặt hàng thất bại. Vui lòng thử lại!",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ═══ LOADING ═══
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress sx={{ color: "#f28900" }} />
      </Box>
    );
  }

  // ═══ CHƯA ĐĂNG NHẬP ═══
  if (!isLoggedIn) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 10, textAlign: "center", p: 4 }}>
        <LockIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Vui lòng đăng nhập
        </Typography>
        <Typography sx={{ color: "#888", mb: 3 }}>
          Bạn cần đăng nhập để tiến hành thanh toán
        </Typography>
        <Button
          variant="contained"
          component={Link}
          to="/login"
          sx={{ bgcolor: "#f28900", "&:hover": { bgcolor: "#e67c00" } }}
        >
          Đăng nhập ngay
        </Button>
      </Box>
    );
  }

  // ═══ GIỎ HÀNG TRỐNG ═══
  if (cartItems.length === 0) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 10, textAlign: "center", p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Giỏ hàng trống
        </Typography>
        <Typography sx={{ color: "#888", mb: 3 }}>
          Hãy thêm sản phẩm vào giỏ trước khi thanh toán
        </Typography>
        <Button
          variant="contained"
          component={Link}
          to="/shop"
          sx={{ bgcolor: "#f28900", "&:hover": { bgcolor: "#e67c00" } }}
        >
          Khám phá cửa hàng
        </Button>
      </Box>
    );
  }

  // ═══ MAIN CHECKOUT ═══
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Container maxWidth="xl" sx={{ py: 5 }}>
        {/* ── Header + Back link ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
            Thanh toán
          </Typography>
          <Button
            component={Link}
            to="/cart"
            sx={{ color: "#f28900", textTransform: "none", fontWeight: 600 }}
          >
            ← Quay lại giỏ hàng
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* ═══════════════════════════════════════════════════════════════
              CỘT TRÁI (md=7): Bảng sản phẩm → Địa chỉ → Thanh toán
              ═══════════════════════════════════════════════════════════════ */}
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              {/* ── 1. Sản phẩm trong đơn hàng ── */}
              <Card sx={cardSx}>
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2.5,
                      pt: 2.5,
                      pb: 1.5,
                    }}
                  >
                    <ShoppingBagOutlinedIcon sx={{ color: "#f28900" }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Sản phẩm trong đơn hàng ({cartItems.length})
                    </Typography>
                  </Box>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                        <TableCell sx={{ fontWeight: 600 }}>Sản phẩm</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 110 }}>
                          Đơn giá
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 600, width: 70 }}
                          align="center"
                        >
                          SL
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 600, width: 120 }}
                          align="right"
                        >
                          Thành tiền
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cartItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 1,
                                  overflow: "hidden",
                                  border: "1px solid #eee",
                                  flexShrink: 0,
                                }}
                              >
                                <img
                                  src={
                                    item.variant?.imageUrl ||
                                    "https://placehold.co/48x48?text=No+Image"
                                  }
                                  alt={
                                    item.variant?.product?.name || "Sản phẩm"
                                  }
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: 250,
                                  }}
                                >
                                  {item.variant?.product?.name || "Sản phẩm"}
                                </Typography>
                                {item.variant?.variantName && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {item.variant.variantName}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatMoney(item.unitPrice)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {item.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatMoney(item.unitPrice * item.quantity)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* ── 2. Địa chỉ giao hàng ── */}
              <Card sx={cardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2.5,
                    }}
                  >
                    <LocationOnOutlinedIcon sx={{ color: "#f28900" }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Địa chỉ giao hàng
                    </Typography>
                  </Box>

                  {/* ── Form nhập địa chỉ nhận hàng kèm GHN dropdowns ── */}
                  <>
                      {/* Tên + SĐT */}
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <TextField
                          label="Họ tên người nhận *"
                          name="shippingName"
                          value={formData.shippingName}
                          onChange={handleChange}
                          error={!!errors.shippingName}
                          helperText={errors.shippingName}
                          variant="outlined"
                          fullWidth
                          sx={selectSx}
                        />
                        <TextField
                          label="Số điện thoại *"
                          name="shippingPhone"
                          value={formData.shippingPhone}
                          onChange={handleChange}
                          error={!!errors.shippingPhone}
                          helperText={errors.shippingPhone}
                          variant="outlined"
                          fullWidth
                          sx={selectSx}
                        />
                      </Stack>

                      {/* ── GHN Dropdown: Tỉnh/Thành ── */}
                      <FormControl
                        fullWidth
                        sx={{ mb: 2, ...selectSx }}
                        error={!!errors.province}
                      >
                        <InputLabel>Tỉnh / Thành phố *</InputLabel>
                        <Select
                          value={selectedProvince?.id || ""}
                          label="Tỉnh / Thành phố *"
                          onChange={(e) => {
                            const prov = provinces.find(
                              (p) => p.provinceId === e.target.value
                            );
                            onProvinceChange(
                              prov?.provinceId || null,
                              prov?.provinceName || ""
                            );
                            if (errors.province)
                              setErrors((prev) => ({ ...prev, province: "" }));
                          }}
                          disabled={provinces.length === 0}
                        >
                          <MenuItem value="">
                            <em>-- Chọn tỉnh/thành phố --</em>
                          </MenuItem>
                          {provinces.map((p) => (
                            <MenuItem key={p.provinceId} value={p.provinceId}>
                              {p.provinceName}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.province && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                            {errors.province}
                          </Typography>
                        )}
                      </FormControl>

                      {/* ── GHN Dropdown: Quận/Huyện ── */}
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <FormControl
                          fullWidth
                          sx={selectSx}
                          error={!!errors.district}
                          disabled={!selectedProvince || loadingDistricts}
                        >
                          <InputLabel>
                            Quận / Huyện *
                            {loadingDistricts && " (Đang tải...)"}
                          </InputLabel>
                          <Select
                            value={selectedDistrict?.id || ""}
                            label={`Quận / Huyện *${loadingDistricts ? " (Đang tải...)" : ""}`}
                            onChange={(e) => {
                              const dist = districts.find(
                                (d) => d.districtId === e.target.value
                              );
                              onDistrictChange(
                                dist?.districtId || null,
                                dist?.districtName || ""
                              );
                              if (errors.district)
                                setErrors((prev) => ({ ...prev, district: "" }));
                            }}
                          >
                            <MenuItem value="">
                              <em>-- Chọn quận/huyện --</em>
                            </MenuItem>
                            {districts.map((d) => (
                              <MenuItem key={d.districtId} value={d.districtId}>
                                {d.districtName}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.district && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                              {errors.district}
                            </Typography>
                          )}
                        </FormControl>

                        {/* ── GHN Dropdown: Phường/Xã ── */}
                        <FormControl
                          fullWidth
                          sx={selectSx}
                          error={!!errors.ward}
                          disabled={!selectedDistrict || loadingWards}
                        >
                          <InputLabel>
                            Phường / Xã *
                            {loadingWards && " (Đang tải...)"}
                          </InputLabel>
                          <Select
                            value={selectedWard?.code || ""}
                            label={`Phường / Xã *${loadingWards ? " (Đang tải...)" : ""}`}
                            onChange={(e) => {
                              // wardCode là String!
                              const ward = wards.find(
                                (w) => w.wardCode === e.target.value
                              );
                              onWardChange(
                                ward?.wardCode || null,   // String
                                ward?.wardName || ""
                              );
                              if (errors.ward)
                                setErrors((prev) => ({ ...prev, ward: "" }));
                            }}
                          >
                            <MenuItem value="">
                              <em>-- Chọn phường/xã --</em>
                            </MenuItem>
                            {wards.map((w) => (
                              <MenuItem key={w.wardCode} value={w.wardCode}>
                                {w.wardName}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.ward && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                              {errors.ward}
                            </Typography>
                          )}
                        </FormControl>
                      </Stack>

                      {/* Địa chỉ chi tiết */}
                      <TextField
                        label="Địa chỉ chi tiết (Số nhà, tên đường...) *"
                        name="shippingAddress"
                        value={formData.shippingAddress}
                        onChange={handleChange}
                        error={!!errors.shippingAddress}
                        helperText={errors.shippingAddress}
                        variant="outlined"
                        fullWidth
                        sx={selectSx}
                      />

                      {/* ── Phí ship realtime ── */}
                      <ShippingInfoBox
                        shippingInfo={shippingInfo}
                        loading={loadingShipping}
                      />
                    </>
                </CardContent>
              </Card>

              {/* ── 3. Phương thức thanh toán ── */}
              <Card sx={cardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2.5,
                    }}
                  >
                    <PaymentIcon sx={{ color: "#f28900" }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Phương thức thanh toán
                    </Typography>
                  </Box>

                  {errors.paymentMethod && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {errors.paymentMethod}
                    </Alert>
                  )}

                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {[
                      {
                        value: "COD",
                        icon: <LocalShippingOutlinedIcon fontSize="small" />,
                        label: "Thanh toán khi nhận hàng (COD)",
                      },
                      {
                        value: "BANK_TRANSFER",
                        icon: <AccountBalanceIcon fontSize="small" />,
                        label: "Chuyển khoản ngân hàng",
                      },
                      {
                        value: "MOMO",
                        icon: <WalletIcon fontSize="small" />,
                        label: "Ví MoMo",
                      },
                      {
                        value: "VNPAY",
                        icon: <PaymentIcon fontSize="small" />,
                        label: "VNPay",
                      },
                      {
                        value: "ZALOPAY",
                        icon: <WalletIcon fontSize="small" />,
                        label: "ZaloPay",
                      },
                    ].map((pm) => (
                      <FormControlLabel
                        key={pm.value}
                        value={pm.value}
                        control={<Radio />}
                        label={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ color: "#666", display: "flex" }}>
                              {pm.icon}
                            </Box>
                            <Typography>{pm.label}</Typography>
                          </Box>
                        }
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* ═══════════════════════════════════════════════════════════════
              CỘT PHẢI (md=5): Tóm tắt + Coupon + Ghi chú + Đặt hàng
              ═══════════════════════════════════════════════════════════════ */}
          <Grid item xs={12} md={5}>
            <Box sx={{ position: { md: "sticky" }, top: { md: 20 } }}>
              <Stack spacing={3}>
                {/* ── Tóm tắt đơn hàng ── */}
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <ReceiptLongOutlinedIcon sx={{ color: "#f28900" }} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Tóm tắt đơn hàng
                      </Typography>
                    </Box>

                    <Stack spacing={1.5}>
                      {/* Tạm tính */}
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Tạm tính ({cartItems.length} sản phẩm)
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatMoney(subtotal)}
                        </Typography>
                      </Box>

                      {/* Phí vận chuyển — realtime từ GHN */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Phí vận chuyển
                          </Typography>
                          {/* Tên dịch vụ ship */}
                          {shippingInfo?.serviceName && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              🚚 {shippingInfo.serviceName}
                            </Typography>
                          )}
                          {/* Ngày giao dự kiến */}
                          {shippingInfo?.estimatedDeliveryDisplay && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              📅 {shippingInfo.estimatedDeliveryDisplay}
                            </Typography>
                          )}
                        </Box>

                        {loadingShipping ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CircularProgress size={14} sx={{ color: "#f28900" }} />
                            <Typography variant="caption" color="text.secondary">
                              Đang tính...
                            </Typography>
                          </Box>
                        ) : shippingInfo ? (
                          shippingInfo.freeShipping ? (
                            <Tooltip title={shippingInfo.freeShippingReason || ""}>
                              <Chip
                                label="🎁 MIỄN PHÍ"
                                size="small"
                                sx={{ bgcolor: "#2e7d32", color: "#fff", fontSize: "0.7rem" }}
                              />
                            </Tooltip>
                          ) : (
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ color: "#f28900" }}
                            >
                              {shippingInfo.shippingFeeFormatted}
                            </Typography>
                          )
                        ) : (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            Chọn phường/xã để xem phí ship
                          </Typography>
                        )}
                      </Box>

                      {/* Giảm giá coupon */}
                      {discountAmount > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2" sx={{ color: "#2e7d32" }}>
                            Giảm giá
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            sx={{ color: "#2e7d32" }}
                          >
                            -{formatMoney(discountAmount)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold">
                        Tổng cộng
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ color: "#f28900" }}
                      >
                        {shippingInfo
                          ? formatMoney(totalAmount)
                          : `${formatMoney(subtotal - discountAmount)} + phí ship`}
                      </Typography>
                    </Box>

                    {/* Free shipping banner */}
                    {shippingInfo?.freeShipping && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                          mt: 1,
                        }}
                      >
                        <CheckCircleOutlineIcon
                          sx={{ fontSize: 16, color: "#2e7d32" }}
                        />
                        <Typography variant="caption" sx={{ color: "#2e7d32" }}>
                          {shippingInfo.freeShippingReason ||
                            "Đơn hàng đủ điều kiện miễn phí vận chuyển!"}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* ── Mã giảm giá ── */}
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <ConfirmationNumberOutlinedIcon
                        sx={{ color: "#f28900" }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Mã giảm giá
                      </Typography>
                      <Box sx={{ ml: "auto" }}>
                        <CouponSelector 
                          onSelect={(code) => handlePreviewCoupon(code)} 
                          selectedCode={couponResult?.couponCode || couponCode}
                        />
                      </Box>
                    </Box>


                    {couponResult ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          bgcolor: "#e8f5e9",
                          borderRadius: 1,
                          p: 1.5,
                          border: "1px solid #c8e6c9",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <CheckCircleOutlineIcon
                            sx={{ color: "#2e7d32", fontSize: 20 }}
                          />
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "#2e7d32" }}
                            >
                              {couponResult.couponCode}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "#4caf50" }}
                            >
                              {couponResult.message ||
                                `Giảm ${formatMoney(couponResult.discountAmount)}`}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label="Xoá"
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={handleRemoveCoupon}
                          sx={{ cursor: "pointer" }}
                        />
                      </Box>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <TextField
                          placeholder="Nhập mã giảm giá..."
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError("");
                          }}
                          error={!!couponError}
                          helperText={couponError}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), handlePreviewCoupon())
                          }
                          variant="outlined"
                          fullWidth
                          sx={selectSx}
                        />
                        <Button
                          variant="outlined"
                          onClick={handlePreviewCoupon}
                          disabled={!couponCode.trim() || couponLoading}
                          sx={{
                            minWidth: 100,
                            borderColor: "#f28900",
                            color: "#f28900",
                            fontWeight: 600,
                            "&:hover": {
                              borderColor: "#e67c00",
                              bgcolor: "#fff8ef",
                            },
                          }}
                        >
                          {couponLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            "Áp dụng"
                          )}
                        </Button>
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {/* ── Ghi chú đơn hàng ── */}
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <EditNoteIcon sx={{ color: "#f28900" }} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Ghi chú
                      </Typography>
                    </Box>
                    <TextField
                      placeholder="Ghi chú cho đơn hàng (không bắt buộc)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={3}
                      sx={selectSx}
                    />
                  </CardContent>
                </Card>

                {/* ── Nút đặt hàng ── */}
                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  size="large"
                  disabled={submitting || loadingShipping}
                  sx={{
                    bgcolor: "#f28900",
                    "&:hover": {
                      bgcolor: "#e67c00",
                      boxShadow: "0 4px 12px rgba(242,137,0,0.35)",
                    },
                    "&:disabled": { bgcolor: "#ccc" },
                    py: 1.5,
                    fontSize: "1rem",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: 2,
                  }}
                >
                  {submitting ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    <>
                      <LockIcon sx={{ mr: 1, fontSize: 18 }} />
                      Đặt hàng ngay
                    </>
                  )}
                </Button>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                  }}
                >
                  <LockIcon sx={{ fontSize: 14, color: "#bbb" }} />
                  <Typography variant="caption" sx={{ color: "#bbb" }}>
                    Thanh toán an toàn &amp; bảo mật
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Snackbar thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Checkout;
