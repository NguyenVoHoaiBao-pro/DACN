import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  FormHelperText,
  Alert,
  InputAdornment,
  useTheme,
  alpha,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Inventory2 as InventoryIcon,
  AttachMoney as AttachMoneyIcon,
  Category as CategoryIcon,
  Domain as DomainIcon,
  LocalOffer as LocalOfferIcon,
  Notes as NotesIcon,
  ToggleOn as ToggleIcon,
  Title as TitleIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { adminCreateProduct } from "../../services/productService";
import { adminGetCategories, adminGetProducers, adminGetActiveCoupons } from "../../services/masterService";
import { toast } from "react-toastify";

const AdminProductFormPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [coupons, setCoupons] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    quantity: 0,
    detail: "",
    status: "ACTIVE",
    productTypeId: "",
    producerId: "",
    couponId: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [cats, prods, cups] = await Promise.all([
          adminGetCategories(),
          adminGetProducers(),
          adminGetActiveCoupons(),
        ]);
        setCategories(cats || []);
        setProducers(prods || []);
        setCoupons(cups || []);
      } catch (error) {
        console.error("Error fetching master data:", error);
        toast.error("Lỗi khi tải dữ liệu danh mục/NSX");
      }
    };
    fetchMasters();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const res = await adminCreateProduct({
        ...formData,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
        couponId: formData.couponId || null,
      });

      if (res.success) {
        toast.success("🎉 Tạo sản phẩm thành công!");
        navigate(`/admin/products/${res.data.id}`);
      } else {
        if (res.error) setErrors(res.error);
        toast.error(res.message || "Tạo sản phẩm thất bại");
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error) {
        setErrors(error.response.data.error);
        toast.error("Vui lòng kiểm tra lại thông tin đã nhập");
      } else if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn");
        navigate("/login");
      } else if (error.response?.status === 403) {
        toast.error("Bạn không có quyền thực hiện thao tác này");
      } else {
        toast.error("Đã xảy ra lỗi khi tạo sản phẩm");
      }
    } finally {
      setLoading(false);
    }
  };

  const textFieldStyles = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      transition: "0.2s ease",
      backgroundColor: "#f8fafc",
      "&:hover": { backgroundColor: "#f1f5f9" },
      "&.Mui-focused": { backgroundColor: "#ffffff", boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}` }
    },
    "& .MuiInputLabel-root": { fontWeight: 500 }
  };

  return (
    <AdminLayout currentPage="Sản phẩm">
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: "auto", animation: "fadeIn 0.5s ease-out" }}>

        {/* Header Section */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 4, gap: 2 }}>
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/admin/products")}
              sx={{ mb: 1.5, textTransform: "none", color: "text.secondary", fontWeight: "bold", "&:hover": { bgcolor: "transparent", color: "primary.main" } }}
              disableRipple
            >
              Quay lại danh sách
            </Button>
            <Typography variant="h4" fontWeight="800" sx={{ color: "#1e293b", letterSpacing: "-0.5px" }}>
              ✨ Thêm Sản Phẩm Mới
            </Typography>
            <Typography variant="body1" sx={{ color: "#64748b", mt: 0.5 }}>
              Điền thông tin cơ bản của sản phẩm trước khi thêm hình ảnh và biến thể.
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Cột trái: Thông tin chính */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: "20px", mb: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", overflow: "visible" }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 1.5 }}>
                    <Box sx={{ p: 1, bgcolor: "primary.light", borderRadius: "10px", color: "primary.main", display: "flex" }}>
                      <TitleIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: "700", color: "#0f172a" }}>
                      Mô tả & Định danh
                    </Typography>
                  </Box>

                  <Stack spacing={4}>
                    <TextField
                      label="Tên sản phẩm *"
                      name="name"
                      fullWidth
                      value={formData.name}
                      onChange={handleChange}
                      error={!!errors.name}
                      helperText={errors.name}
                      placeholder="VD: iPhone 16 Pro Max 512GB"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TitleIcon sx={{ color: errors.name ? "error.main" : "text.secondary" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyles}
                    />

                    <TextField
                      label="Mô tả chi tiết (HTML)"
                      name="detail"
                      fullWidth
                      multiline
                      rows={10}
                      value={formData.detail}
                      onChange={handleChange}
                      placeholder="<p>Nhập mô tả sản phẩm ở đây...</p>"
                      helperText="Hỗ trợ mã HTML đơn giản. Ví dụ: <ul><li>Tính năng 1</li></ul>"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1.5 }}>
                            <NotesIcon sx={{ color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyles}
                    />
                  </Stack>
                </CardContent>
              </Card>

              {/* Tips Banner */}
              <Alert
                icon={<InventoryIcon sx={{ mt: 0.2 }} />}
                severity="info"
                sx={{
                  borderRadius: "16px",
                  bgcolor: "#f0f9ff",
                  color: "#0369a1",
                  border: "1px solid #bae6fd",
                  "& .MuiAlert-icon": { color: "#0ea5e9" },
                  boxShadow: "0 2px 10px rgba(14,165,233,0.1)"
                }}
              >
                <Typography variant="body2" sx={{ fontSize: "0.95rem" }}>
                  <strong>Quy trình đăng sản phẩm:</strong> Bạn chỉ cần tạo thông tin cơ bản tại đây. Sau khi lưu thành công, hệ thống sẽ mở ra giao diện chi tiết để bạn có thể <strong>upload nhiều hình ảnh</strong> và <strong>tạo các phân loại hàng (biến thể màu sắc, dung lượng...)</strong> cực kỳ dễ dàng.
                </Typography>
              </Alert>
            </Grid>

            {/* Cột phải: Giá cả & Phân loại */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: "20px", mb: 3, borderTop: `4px solid ${theme.palette.primary.main}`, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: "700", color: "#0f172a" }}>
                    Thiết lập phân phối
                  </Typography>
                  <Stack spacing={3.5}>

                    {/* Giá bán */}
                    <TextField
                      label="Giá bán gốc (VNĐ) *"
                      name="price"
                      type="number"
                      fullWidth
                      value={formData.price}
                      onChange={handleChange}
                      error={!!errors.price}
                      helperText={errors.price || (formData.price ? `= ${new Intl.NumberFormat("vi-VN").format(formData.price)} ₫` : "")}
                      inputProps={{ min: 0 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoneyIcon sx={{ color: errors.price ? "error.main" : "text.secondary" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyles}
                    />

                    {/* Số lượng */}
                    <TextField
                      label="Tồn kho ban đầu"
                      name="quantity"
                      type="number"
                      fullWidth
                      value={formData.quantity}
                      onChange={handleChange}
                      error={!!errors.quantity}
                      helperText={errors.quantity}
                      inputProps={{ min: 0 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <InventoryIcon sx={{ color: errors.quantity ? "error.main" : "text.secondary", fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyles}
                    />

                    <Divider sx={{ borderStyle: "dashed", my: 1 }} />

                    {/* Danh mục */}
                    <FormControl fullWidth error={!!errors.productTypeId}>
                      <InputLabel>Danh mục *</InputLabel>
                      <Select
                        name="productTypeId"
                        label="Danh mục *"
                        value={formData.productTypeId}
                        onChange={handleChange}
                        startAdornment={
                          <InputAdornment position="start">
                            <CategoryIcon sx={{ ml: 1, color: "text.secondary", fontSize: 20 }} />
                          </InputAdornment>
                        }
                        sx={{ borderRadius: "12px", bgcolor: "#f8fafc" }}
                      >
                        {categories.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.productTypeId && <FormHelperText>{errors.productTypeId}</FormHelperText>}
                    </FormControl>

                    {/* Nhà sản xuất */}
                    <FormControl fullWidth error={!!errors.producerId}>
                      <InputLabel>Thương hiệu *</InputLabel>
                      <Select
                        name="producerId"
                        label="Thương hiệu *"
                        value={formData.producerId}
                        onChange={handleChange}
                        startAdornment={
                          <InputAdornment position="start">
                            <DomainIcon sx={{ ml: 1, color: "text.secondary", fontSize: 20 }} />
                          </InputAdornment>
                        }
                        sx={{ borderRadius: "12px", bgcolor: "#f8fafc" }}
                      >
                        {producers.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.producerId && <FormHelperText>{errors.producerId}</FormHelperText>}
                    </FormControl>

                    {/* Coupon */}
                    <FormControl fullWidth>
                      <InputLabel>Mã giảm giá</InputLabel>
                      <Select
                        name="couponId"
                        label="Mã giảm giá"
                        value={formData.couponId}
                        onChange={handleChange}
                        startAdornment={
                          <InputAdornment position="start">
                            <LocalOfferIcon sx={{ ml: 1, color: "text.secondary", fontSize: 20 }} />
                          </InputAdornment>
                        }
                        sx={{ borderRadius: "12px", bgcolor: "#f8fafc" }}
                      >
                        <MenuItem value=""><em>(Không có mã áp dụng)</em></MenuItem>
                        {coupons.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.code} - Giảm {c.discountValue}%
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Status */}
                    <FormControl fullWidth>
                      <InputLabel>Trạng thái hiển thị</InputLabel>
                      <Select
                        name="status"
                        label="Trạng thái hiển thị"
                        value={formData.status}
                        onChange={handleChange}
                        startAdornment={
                          <InputAdornment position="start">
                            <ToggleIcon sx={{ ml: 1, color: formData.status === "ACTIVE" ? "success.main" : "text.secondary", fontSize: 22 }} />
                          </InputAdornment>
                        }
                        sx={{ borderRadius: "12px", bgcolor: formData.status === "ACTIVE" ? "#f0fdf4" : "#f8fafc" }}
                      >
                        <MenuItem value="ACTIVE">
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ w: 8, h: 8, borderRadius: "50%", bgcolor: "success.main", display: "inline-block", width: 8, height: 8 }} />
                            Hiển thị ngay (Active)
                          </Box>
                        </MenuItem>
                        <MenuItem value="INACTIVE">
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ w: 8, h: 8, borderRadius: "50%", bgcolor: "error.main", display: "inline-block", width: 8, height: 8 }} />
                            Lưu nháp / Ẩn
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                  </Stack>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <SaveIcon />}
                sx={{
                  py: 2,
                  borderRadius: "16px",
                  fontWeight: "800",
                  textTransform: "none",
                  fontSize: "1.1rem",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                  boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: "linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)",
                    boxShadow: "0 15px 30px -5px rgba(37, 99, 235, 0.5)",
                    transform: "translateY(-2px)"
                  },
                  "&:active": {
                    transform: "translateY(0)"
                  }
                }}
              >
                {loading ? "Đang khởi tạo..." : "Tạo Sản Phẩm Mới"}
              </Button>
            </Grid>
          </Grid>
        </form>

      </Box>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminProductFormPage;
