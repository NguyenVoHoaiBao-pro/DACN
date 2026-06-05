import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Alert,
  FormHelperText,
  Autocomplete,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Layers as LayersIcon,
  Image as ImageIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { usePermissions } from "../../hooks/usePermissions";
import {
  adminGetProductDetail,
  adminUpdateProduct,
  adminAddVariant,
  adminUpdateVariant,
  adminDeleteVariant,
  adminAddImage,
  adminDeleteImage,
} from "../../services/productService";
import { adminGetCategories, adminGetProducers, adminGetActiveCoupons, adminGetAttributeValues } from "../../services/masterService";
import { toast } from "react-toastify";

const AdminProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSalesUser, hasPermission } = usePermissions();
  const readOnlyCatalog = isSalesUser && !hasPermission("PRODUCT_MANAGE");
  const [tabIndex, setTabIndex] = useState(0);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Master data for dropdowns
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [coupons, setCoupons] = useState([]);

  // Modal states
  const [variantModal, setVariantModal] = useState({ open: false, mode: "add", data: null });
  const [imageModal, setImageModal] = useState({ open: false });
  const [deleteVariantDialog, setDeleteVariantDialog] = useState({ open: false, variantId: null, variantName: "" });
  const [deleteImageDialog, setDeleteImageDialog] = useState({ open: false, imageId: null });

  useEffect(() => {
    fetchProduct();
    fetchMasters();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const data = await adminGetProductDetail(id);
      if (data) setProduct(data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Không tìm thấy sản phẩm");
      } else if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn");
        navigate("/login");
        return;
      } else {
        toast.error("Lỗi khi tải dữ liệu sản phẩm");
      }
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  };

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
      console.error("Error loading master data:", error);
    }
  };

  const formatPrice = (price) => {
    if (!price) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 1: PRODUCT INFO
  // ═══════════════════════════════════════════════════════════════════════
  const ProductInfoTab = () => {
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
      name: product?.name || "",
      basePrice: product?.basePrice || 0,
      description: product?.description || "",
      status: product?.status || "ACTIVE",
      productTypeId: product?.productType?.id || "",
      producerId: product?.producer?.id || "",
      couponId: product?.coupon?.id || "",
    });
    const [formErrors, setFormErrors] = useState({});

    const handleUpdate = async () => {
      setSaving(true);
      try {
        const payload = {
          name: formData.name,
          price: Number(formData.basePrice),
          detail: formData.description,
          status: formData.status,
          productTypeId: formData.productTypeId,
          producerId: formData.producerId,
          couponId: formData.couponId || null,
        };

        const res = await adminUpdateProduct(id, payload);
        if (res.success) {
          toast.success("✅ Cập nhật sản phẩm thành công");
          setProduct(res.data);
          setEditMode(false);
          setFormErrors({});
        } else {
          if (res.error) setFormErrors(res.error);
          toast.error(res.message || "Cập nhật thất bại");
        }
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error) {
          setFormErrors(error.response.data.error);
          toast.error("Vui lòng kiểm tra lại thông tin");
        } else {
          toast.error("Lỗi khi cập nhật sản phẩm");
        }
      } finally {
        setSaving(false);
      }
    };

    return (
      <Card sx={{ borderRadius: "12px" }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">Thông tin chi tiết</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {editMode && (
                <Button
                  startIcon={<CancelIcon />}
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    setEditMode(false);
                    setFormErrors({});
                    setFormData({
                      name: product?.name || "",
                      basePrice: product?.basePrice || 0,
                      description: product?.description || "",
                      status: product?.status || "ACTIVE",
                      productTypeId: product?.productType?.id || "",
                      producerId: product?.producer?.id || "",
                      couponId: product?.coupon?.id || "",
                    });
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Huỷ
                </Button>
              )}
              {!readOnlyCatalog && (
                <Button
                  startIcon={editMode ? (saving ? <CircularProgress size={18} /> : <SaveIcon />) : <EditIcon />}
                  variant={editMode ? "contained" : "outlined"}
                  onClick={() => (editMode ? handleUpdate() : setEditMode(true))}
                  color={editMode ? "success" : "primary"}
                  disabled={saving}
                  sx={{ textTransform: "none" }}
                >
                  {editMode ? (saving ? "Đang lưu..." : "Lưu thay đổi") : "Chỉnh sửa"}
                </Button>
              )}
            </Box>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <TextField
                  label="Tên sản phẩm"
                  fullWidth
                  value={editMode ? formData.name : (product?.name || "")}
                  disabled={!editMode}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <TextField
                  label="Giá bán (VNĐ)"
                  fullWidth
                  type="number"
                  value={editMode ? formData.basePrice : (product?.basePrice || 0)}
                  disabled={!editMode}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  error={!!formErrors.price}
                  helperText={formErrors.price || (editMode && formData.basePrice ? `= ${new Intl.NumberFormat("vi-VN").format(formData.basePrice)} ₫` : "")}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <FormControl fullWidth disabled={!editMode} error={!!formErrors.productTypeId}>
                  <InputLabel>Danh mục</InputLabel>
                  <Select
                    value={editMode ? formData.productTypeId : (product?.productType?.id || "")}
                    label="Danh mục"
                    onChange={(e) => setFormData({ ...formData, productTypeId: e.target.value })}
                    sx={{ borderRadius: "10px" }}
                  >
                    {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                  {formErrors.productTypeId && <FormHelperText>{formErrors.productTypeId}</FormHelperText>}
                </FormControl>
                <FormControl fullWidth disabled={!editMode} error={!!formErrors.producerId}>
                  <InputLabel>Nhà sản xuất</InputLabel>
                  <Select
                    value={editMode ? formData.producerId : (product?.producer?.id || "")}
                    label="Nhà sản xuất"
                    onChange={(e) => setFormData({ ...formData, producerId: e.target.value })}
                    sx={{ borderRadius: "10px" }}
                  >
                    {producers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                  {formErrors.producerId && <FormHelperText>{formErrors.producerId}</FormHelperText>}
                </FormControl>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <FormControl fullWidth disabled={!editMode}>
                  <InputLabel>Mã giảm giá</InputLabel>
                  <Select
                    value={editMode ? formData.couponId : (product?.coupon?.id || "")}
                    label="Mã giảm giá"
                    onChange={(e) => setFormData({ ...formData, couponId: e.target.value })}
                    sx={{ borderRadius: "10px" }}
                  >
                    <MenuItem value="">Không áp dụng</MenuItem>
                    {coupons.map((c) => <MenuItem key={c.id} value={c.id}>{c.code} - Giảm {c.discountValue}%</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={!editMode}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={editMode ? formData.status : (product?.status || "ACTIVE")}
                    label="Trạng thái"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    sx={{ borderRadius: "10px" }}
                  >
                    <MenuItem value="ACTIVE">🟢 Hoạt động (Active)</MenuItem>
                    <MenuItem value="INACTIVE">🔴 Đã ẩn (Inactive)</MenuItem>
                  </Select>
                </FormControl>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                    Mô tả sản phẩm
                  </Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="<p>Nhập mô tả HTML...</p>"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                    />
                  ) : (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f8fafc", minHeight: "120px", borderRadius: "10px" }}>
                      <div dangerouslySetInnerHTML={{ __html: product?.description || "Chưa có mô tả" }} />
                    </Paper>
                  )}
                </Box>
                {readOnlyCatalog && product?.specifications?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                      Thông số kỹ thuật
                    </Typography>
                    <Grid container spacing={1}>
                      {product.specifications.map((s) => (
                        <Grid item xs={12} sm={6} key={`${s.code}-${s.value}`}>
                          <Typography variant="caption" color="text.secondary">
                            {s.name}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {s.value}
                            {s.unit ? ` ${s.unit}` : ""}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 2: VARIANTS
  // ═══════════════════════════════════════════════════════════════════════
  const VariantsTab = () => {
    const [submitting, setSubmitting] = useState(false);
    const [allAttributeValues, setAllAttributeValues] = useState([]);
    const [selectedAttrIds, setSelectedAttrIds] = useState([]);

    // Load available attribute values on mount
    useEffect(() => {
      const loadAttrValues = async () => {
        // Try API first
        const apiValues = await adminGetAttributeValues();
        if (apiValues && apiValues.length > 0) {
          setAllAttributeValues(apiValues);
          return;
        }
        // Fallback: extract unique values from existing product variants
        const extracted = new Map();
        product?.variants?.forEach(v => {
          v.attributeValues?.forEach(attr => {
            if (attr.id && !extracted.has(attr.id)) {
              extracted.set(attr.id, { id: attr.id, attributeName: attr.attributeName || attr.name, value: attr.value });
            }
          });
        });
        setAllAttributeValues(Array.from(extracted.values()));
      };
      loadAttrValues();
    }, []);

    // Pre-select when editing a variant
    useEffect(() => {
      if (variantModal.open && variantModal.data?.attributeValues) {
        setSelectedAttrIds(variantModal.data.attributeValues.map(a => a.id));
      } else if (variantModal.open) {
        setSelectedAttrIds([]);
      }
    }, [variantModal.open, variantModal.data]);

// unused state hooks omitted

    const handleVariantSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      const data = new FormData(e.currentTarget);
      const payload = {
        skuCode: data.get("skuCode"),
        variantName: data.get("variantName"),
        price: Number(data.get("price")),
        originalPrice: data.get("originalPrice") ? Number(data.get("originalPrice")) : null,
        stockQuantity: Number(data.get("stockQuantity")),
        isActive: data.get("isActive") === "true",
        isDefault: data.get("isDefault") === "true",
        attributeValueIds: selectedAttrIds,
      };

      try {
        let res;
        if (variantModal.mode === "add") {
          res = await adminAddVariant(id, payload);
        } else {
          res = await adminUpdateVariant(id, variantModal.data.id, payload);
        }

        if (res.success) {
          toast.success(variantModal.mode === "add" ? "✅ Thêm biến thể thành công" : "✅ Cập nhật biến thể thành công");
          setVariantModal({ open: false, mode: "add", data: null });
          fetchProduct();
        } else {
          toast.error(res.message || "Lỗi khi xử lý biến thể");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi khi xử lý biến thể");
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteVariantConfirm = async () => {
      try {
        const res = await adminDeleteVariant(id, deleteVariantDialog.variantId);
        if (res.success) {
          toast.success("✅ Vô hiệu hóa biến thể thành công (Ngưng bán)");
          fetchProduct();
        } else {
          toast.error(res.message || "Lỗi khi xóa biến thể");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi khi xóa biến thể");
      } finally {
        setDeleteVariantDialog({ open: false, variantId: null, variantName: "" });
      }
    };

    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">Danh sách biến thể</Typography>
          {!readOnlyCatalog && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setVariantModal({ open: true, mode: "add", data: null })}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                bgcolor: "#3182ce",
                "&:hover": { bgcolor: "#2b6cb0" },
              }}
            >
              Thêm biến thể
            </Button>
          )}
        </Box>

        {(!product?.variants || product.variants.length === 0) ? (
          <Paper sx={{ py: 6, textAlign: "center", border: "2px dashed #e2e8f0", borderRadius: "12px" }}>
            <LayersIcon sx={{ fontSize: 48, color: "#cbd5e0", mb: 1 }} />
            <Typography color="text.secondary">Chưa có biến thể nào</Typography>
            <Typography variant="caption" color="text.secondary">Nhấn "Thêm biến thể" để bắt đầu</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: "12px" }}>
            <Table>
              <TableHead sx={{ bgcolor: "#f7fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Tên biến thể</TableCell>
                  {readOnlyCatalog && (
                    <TableCell sx={{ fontWeight: "bold" }}>Cấu hình</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: "bold" }}>Giá bán</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    {readOnlyCatalog ? "Sẵn bán" : "Tồn kho"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">Mặc định</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {product?.variants?.map((v) => (
                  <TableRow key={v.id} hover sx={{ opacity: v.isActive ? 1 : 0.5, bgcolor: v.isActive ? "inherit" : "#f9fafb" }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", bgcolor: "#f0f4f8", px: 1, py: 0.5, borderRadius: 1, display: "inline-block" }}>
                        {v.skuCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{v.variantName}</Typography>
                    </TableCell>
                    {readOnlyCatalog && (
                      <TableCell>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {(v.attributeValues || []).map((a) => (
                            <Chip
                              key={a.id}
                              label={`${a.attributeName}: ${a.value}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {!v.attributeValues?.length && "—"}
                        </Stack>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                        {formatPrice(v.price)}
                      </Typography>
                      {v.originalPrice && (
                        <Typography variant="caption" sx={{ textDecoration: "line-through", color: "text.secondary" }}>
                          {formatPrice(v.originalPrice)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          color: (readOnlyCatalog ? v.availableQuantity : v.stockQuantity) === 0
                            ? "error.main"
                            : (readOnlyCatalog ? v.availableQuantity : v.stockQuantity) <= 10
                              ? "warning.main"
                              : "text.primary",
                          fontWeight: (readOnlyCatalog ? v.availableQuantity : v.stockQuantity) <= 10 ? "bold" : "normal",
                        }}
                      >
                        {readOnlyCatalog ? (v.availableQuantity ?? 0) : v.stockQuantity}
                      </Typography>
                      {readOnlyCatalog && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Kho: {v.stockQuantity ?? 0}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {v.isDefault ? <Chip label="Mặc định" size="small" color="primary" /> : "—"}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={v.isActive ? "Đang bán" : "Ngưng bán"}
                        size="small"
                        color={v.isActive ? "success" : "default"}
                        sx={v.isActive ? {} : { bgcolor: "#fee2e2", color: "#991b1b", fontWeight: "bold" }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {!readOnlyCatalog ? (
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" color="primary" onClick={() => setVariantModal({ open: true, mode: "edit", data: v })}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {v.isActive && (
                            <Tooltip title="Ngưng bán (Vô hiệu hóa)">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => setDeleteVariantDialog({ open: true, variantId: v.id, variantName: v.variantName })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Variant Add/Edit Dialog */}
        <Dialog open={variantModal.open} onClose={() => setVariantModal({ ...variantModal, open: false })} fullWidth maxWidth="sm">
          <form onSubmit={handleVariantSubmit}>
            <DialogTitle sx={{ fontWeight: "bold" }}>
              {variantModal.mode === "add" ? "➕ Thêm biến thể mới" : "✏️ Chỉnh sửa biến thể"}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <TextField
                  label="SKU Code"
                  name="skuCode"
                  fullWidth
                  defaultValue={variantModal.data?.skuCode || ""}
                  placeholder="VD: SKU-IP16-BLK-128"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <TextField
                  label="Tên biến thể"
                  name="variantName"
                  fullWidth
                  defaultValue={variantModal.data?.variantName || ""}
                  placeholder="VD: Đen - 256GB"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Giá bán (VNĐ)"
                    name="price"
                    type="number"
                    fullWidth
                    defaultValue={variantModal.data?.price || ""}
                    inputProps={{ min: 0 }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                  />
                  <TextField
                    label="Giá gốc (Gạch ngang)"
                    name="originalPrice"
                    type="number"
                    fullWidth
                    defaultValue={variantModal.data?.originalPrice || ""}
                    inputProps={{ min: 0 }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                  />
                </Stack>
                <TextField
                  label="Số lượng tồn kho"
                  name="stockQuantity"
                  type="number"
                  fullWidth
                  defaultValue={variantModal.data?.stockQuantity || 0}
                  inputProps={{ min: 0 }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                {/* Attribute Values Selection */}
                <Box sx={{ border: "1px solid #e0e0e0", borderRadius: "12px", p: 2, bgcolor: "#fafbfc" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#1e293b" }}>
                      🌟 Thuộc tính biến thể (chọn để khách hàng thấy nút chọn phiên bản)
                    </Typography>
                    <Button 
                      size="small" 
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={() => window.open('/admin/attributes', '_blank')}
                      sx={{ textTransform: "none", borderRadius: "6px" }}
                    >
                      Quản lý Data
                    </Button>
                  </Box>
                  <Autocomplete
                    multiple
                    options={allAttributeValues}
                    groupBy={(option) => option.attributeName || "Khác"}
                    getOptionLabel={(option) => option.value}
                    value={allAttributeValues.filter(av => selectedAttrIds.includes(av.id))}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(event, newValue) => {
                      setSelectedAttrIds(newValue.map(v => v.id));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Tìm kiếm và chọn Master Data... (VD: Đen nhám, 128GB)"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#fff", pt: 1, pb: 1 } }}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...otherProps } = getTagProps({ index });
                        return (
                          <Chip
                            variant="filled"
                            size="small"
                            label={`${option.attributeName}: ${option.value}`}
                            color="primary"
                            key={option.id || key}
                            {...otherProps}
                            sx={{ m: 0.5, fontWeight: "bold" }}
                          />
                        );
                      })
                    }
                    noOptionsText="Chưa có dữ liệu thuộc tính từ Backend (Menu Cấu hình Master Data)"
                  />
                  {selectedAttrIds.length > 0 && (
                    <Typography variant="caption" sx={{ mt: 1.5, display: "block", color: "success.main", fontWeight: "bold" }}>
                      ✅ Đã chọn: {selectedAttrIds.length} thuộc tính (Liên kết IDs: {selectedAttrIds.join(", ")})
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select name="isActive" label="Trạng thái" defaultValue={variantModal.data?.isActive ?? true} sx={{ borderRadius: "10px" }}>
                      <MenuItem value={true}>🟢 Hoạt động</MenuItem>
                      <MenuItem value={false}>🔴 Ẩn</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Mặc định</InputLabel>
                    <Select name="isDefault" label="Mặc định" defaultValue={variantModal.data?.isDefault ?? false} sx={{ borderRadius: "10px" }}>
                      <MenuItem value={true}>Có</MenuItem>
                      <MenuItem value={false}>Không</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setVariantModal({ ...variantModal, open: false })} sx={{ textTransform: "none" }}>
                Huỷ
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} /> : null}
                sx={{ textTransform: "none", borderRadius: "8px" }}
              >
                {submitting ? "Đang lưu..." : "💾 Lưu thông tin"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Variant Confirmation Dialog */}
        <Dialog open={deleteVariantDialog.open} onClose={() => setDeleteVariantDialog({ open: false, variantId: null, variantName: "" })} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: "bold", color: "#d97706" }}>⚠️ Vô hiệu hóa biến thể?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Biến thể <strong>"{deleteVariantDialog.variantName}"</strong> sẽ được chuyển sang trạng thái <strong>"Ngưng bán"</strong>.
              <br /><br />
              Khách hàng sẽ <strong>không còn thấy</strong> biến thể này trên trang mua hàng. Bạn vẫn có thể bật lại bằng cách chỉnh sửa trạng thái biến thể.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDeleteVariantDialog({ open: false, variantId: null, variantName: "" })} sx={{ textTransform: "none" }}>
              Huỷ bỏ
            </Button>
            <Button variant="contained" color="warning" onClick={handleDeleteVariantConfirm} sx={{ textTransform: "none", color: "#fff" }}>
              Ngưng bán
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 3: IMAGES
  // ═══════════════════════════════════════════════════════════════════════
  const ImagesTab = () => {
    const [submitting, setSubmitting] = useState(false);

    const handleImageSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      const data = new FormData(e.currentTarget);
      const payload = {
        linkImage: data.get("linkImage"),
        variantId: data.get("variantId") || null,
        isDefault: data.get("isDefault") === "true",
      };

      try {
        const res = await adminAddImage(id, payload);
        if (res.success) {
          toast.success("✅ Thêm ảnh thành công");
          setImageModal({ open: false });
          fetchProduct();
        } else {
          toast.error(res.message || "Lỗi khi thêm ảnh");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi khi thêm ảnh");
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteImageConfirm = async () => {
      try {
        const res = await adminDeleteImage(id, deleteImageDialog.imageId);
        if (res.success) {
          toast.success("✅ Đã xóa ảnh");
          fetchProduct();
        } else {
          toast.error(res.message || "Lỗi khi xóa ảnh");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi khi xóa ảnh");
      } finally {
        setDeleteImageDialog({ open: false, imageId: null });
      }
    };

    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">Hình ảnh sản phẩm</Typography>
          {!readOnlyCatalog && (
            <Button
              startIcon={<PhotoCameraIcon />}
              variant="contained"
              onClick={() => setImageModal({ open: true })}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                bgcolor: "#3182ce",
                "&:hover": { bgcolor: "#2b6cb0" },
              }}
            >
              Thêm hình ảnh URL
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          {product?.images?.map((img) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={img.id}>
              <Card sx={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { transform: "translateY(-4px)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
              }}>
                <Box sx={{ position: "relative", pt: "100%" }}>
                  <img
                    src={img.linkImage}
                    alt="Product"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E"; }}
                  />
                  {img.isDefault && (
                    <Box sx={{ position: "absolute", top: 8, left: 8 }}>
                      <Chip label="Mặc định" size="small" color="primary" />
                    </Box>
                  )}
                </Box>
                <CardContent sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    {img.variantId ? (
                      <Chip 
                        label={`Ảnh Riêng: #${img.variantId}`}
                        size="small" 
                        variant="outlined"
                        sx={{ color: '#d97706', borderColor: '#d97706', fontWeight: 600 }}
                      />
                    ) : (
                      <Chip 
                        label="Ảnh Chung (Gốc)" 
                        size="small" 
                        variant="filled"
                        sx={{ bgcolor: '#ebf8ff', color: '#3182ce', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  {!readOnlyCatalog && (
                    <Tooltip title="Xoá ảnh vĩnh viễn">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteImageDialog({ open: true, imageId: img.id })}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}

          {(!product?.images || product.images.length === 0) && (
            <Grid item xs={12}>
              <Box sx={{
                py: 6,
                textAlign: "center",
                border: "2px dashed #e2e8f0",
                borderRadius: "12px",
                bgcolor: "#f8fafc",
              }}>
                <ImageIcon sx={{ fontSize: 48, color: "#cbd5e0", mb: 1 }} />
                <Typography color="text.secondary">Chưa có hình ảnh nào</Typography>
                <Typography variant="caption" color="text.secondary">Nhấn "Thêm hình ảnh URL" để bắt đầu</Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Add Image Dialog */}
        <Dialog open={imageModal.open} onClose={() => setImageModal({ open: false })} fullWidth maxWidth="sm">
          <form onSubmit={handleImageSubmit}>
            <DialogTitle sx={{ fontWeight: "bold" }}>📷 Thêm hình ảnh mới</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <TextField
                  label="URL Hình ảnh"
                  name="linkImage"
                  fullWidth
                  required
                  placeholder="https://example.com/product-image.jpg"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <FormControl fullWidth>
                  <InputLabel>Gắn với biến thể (Tùy chọn)</InputLabel>
                  <Select name="variantId" label="Gắn với biến thể (Tùy chọn)" defaultValue="" sx={{ borderRadius: "10px" }}>
                    <MenuItem value="">Dùng chung cho sản phẩm</MenuItem>
                    {product?.variants?.map((v) => (
                      <MenuItem key={v.id} value={v.id}>{v.variantName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Ảnh mặc định</InputLabel>
                  <Select name="isDefault" label="Ảnh mặc định" defaultValue={false} sx={{ borderRadius: "10px" }}>
                    <MenuItem value={true}>Có — Hiển thị làm thumbnail</MenuItem>
                    <MenuItem value={false}>Không</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setImageModal({ open: false })} sx={{ textTransform: "none" }}>Huỷ</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} /> : null}
                sx={{ textTransform: "none", borderRadius: "8px" }}
              >
                {submitting ? "Đang thêm..." : "📷 Thêm ảnh"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Image Confirmation Dialog */}
        <Dialog open={deleteImageDialog.open} onClose={() => setDeleteImageDialog({ open: false, imageId: null })} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: "bold", color: "#e53e3e" }}>⚠️ Xoá ảnh vĩnh viễn?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Ảnh sẽ bị xoá vĩnh viễn khỏi sản phẩm. Hành động này <strong>không thể hoàn tác</strong>.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDeleteImageDialog({ open: false, imageId: null })} sx={{ textTransform: "none" }}>Huỷ bỏ</Button>
            <Button variant="contained" color="error" onClick={handleDeleteImageConfirm} sx={{ textTransform: "none" }}>
              Xoá vĩnh viễn
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  if (loading && !product) {
    return (
      <AdminLayout currentPage="Sản phẩm">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage={readOnlyCatalog ? "Tra cứu sản phẩm" : "Sản phẩm"}>
      <Box sx={{ p: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin/products")}
          sx={{ mb: 3, textTransform: "none", color: "text.secondary", fontWeight: "medium" }}
        >
          Quay lại danh sách
        </Button>

        {readOnlyCatalog && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Chế độ tra cứu — xem cấu hình, tồn <strong>sẵn bán</strong> (IMEI AVAILABLE) và BH:{" "}
            <strong>{product?.warrantyPolicy || "12 tháng"}</strong>.
          </Alert>
        )}

        {/* Product Header */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 3 }}>
          <Avatar
            variant="rounded"
            src={product?.images?.[0]?.linkImage || product?.imageUrl}
            sx={{
              width: 80,
              height: 80,
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <ImageIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight="bold">{product?.name}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label={product?.productType?.name || "—"}
                size="small"
                sx={{ bgcolor: "#ebf8ff", color: "#3182ce", fontWeight: "bold" }}
              />
              <Chip
                label={product?.producer?.name || "—"}
                size="small"
                sx={{ bgcolor: "#faf5ff", color: "#805ad5", fontWeight: "bold" }}
              />
              <Chip
                label={product?.status === "ACTIVE" ? "🟢 Hoạt động" : "🔴 Đã ẩn"}
                size="small"
                color={product?.status === "ACTIVE" ? "success" : "default"}
                sx={{ fontWeight: "bold" }}
              />
              <Chip
                label={`💰 ${formatPrice(product?.basePrice)}`}
                size="small"
                sx={{ bgcolor: "#fffbeb", color: "#d97706", fontWeight: "bold" }}
              />
            </Stack>
          </Box>
        </Box>

        {/* Tab Navigation */}
        <Paper sx={{ borderRadius: "12px", mb: 4, overflow: "hidden" }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            sx={{
              px: 2,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "#fafbfc",
              "& .MuiTab-root": {
                py: 2,
                fontWeight: "bold",
                textTransform: "none",
                fontSize: "0.95rem",
              },
              "& .Mui-selected": { color: "#3182ce" },
              "& .MuiTabs-indicator": { backgroundColor: "#3182ce", height: 3 },
            }}
          >
            <Tab icon={<InfoIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Thông tin cơ bản" />
            <Tab
              icon={<LayersIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={`Biến thể (${product?.variants?.length || 0})`}
            />
            <Tab
              icon={<ImageIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={`Hình ảnh (${product?.images?.length || 0})`}
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabIndex === 0 && <ProductInfoTab key={`info-${product?.id}-${JSON.stringify(product?.productType)}`} />}
            {tabIndex === 1 && <VariantsTab key={`var-${product?.id}-${product?.variants?.length}-${product?.variants?.map(v => v.id).join(',')}`} />}
            {tabIndex === 2 && <ImagesTab key={`img-${product?.id}-${product?.images?.length}-${product?.images?.map(i => i.id).join(',')}`} />}
          </Box>
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default AdminProductDetailPage;
