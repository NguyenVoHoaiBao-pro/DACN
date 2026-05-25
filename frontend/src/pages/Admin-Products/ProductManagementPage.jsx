import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  Inventory as InventoryIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
} from "@mui/material";
import { getCategories, getProducers } from "../../services/masterService";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import HasPermission from "../../components/Auth/HasPermission";
import {
  adminGetProducts,
  adminGetProductStats,
  adminDeleteProduct,
  adminToggleProductStatus,
} from "../../services/productService";
import { isApiSuccess } from "../../utils/apiResponse";

const ProductManagementPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalActive: 0,
    totalInactive: 0,
  });

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [producerFilter, setProducerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Data for filters
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null });
  // Toggle dialog
  const [toggleDialog, setToggleDialog] = useState({ open: false, product: null });

  // ----- FETCH CATEGORIES & PRODUCERS FOR FILTER -----
  useEffect(() => {
    const fetchFilters = async () => {
      // Fetch categories (independent — one failure shouldn't block the other)
      try {
        const data = await getCategories();
        if (data) {
          setCategories(Array.isArray(data) ? data : data.content || []);
        }
      } catch (error) {
        console.warn("Không tải được danh mục (backend có thể chưa sẵn sàng):", error.message);
      }

      try {
        const data = await getProducers();
        if (data) {
          setProducers(Array.isArray(data) ? data : data.content || []);
        }
      } catch (error) {
        console.warn("Không tải được nhà sản xuất (backend có thể chưa sẵn sàng):", error.message);
      }
    };
    fetchFilters();
  }, []);

  // ----- FETCH STATS -----
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminGetProductStats();
      if (isApiSuccess(res)) {
        setStats(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ----- FETCH PRODUCTS FROM API -----
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: rowsPerPage,
        sortBy: "createdAt",
        sortDir: "desc",
      };

      if (searchQuery) params.keyword = searchQuery;
      if (categoryFilter !== "all") params.productTypeId = categoryFilter;
      if (producerFilter !== "all") params.producerId = producerFilter;
      if (statusFilter !== "all") {
        params.isActive = statusFilter === "active";
      }

      const response = await adminGetProducts(params);

      if (isApiSuccess(response) && response.data?.content) {
        setProducts(response.data.content);
        setTotalElements(response.data.totalElements);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách sản phẩm:", error);
      if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        navigate("/login");
      } else if (error.response?.status === 403) {
        toast.error("Bạn không có quyền thực hiện thao tác này");
        navigate("/admin");
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, categoryFilter, producerFilter, statusFilter, navigate]);

  // Debounce fetch
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [fetchProducts]);

  // ----- HANDLERS -----
  const formatPrice = (price) => {
    if (!price) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getStatusColor = (status) => {
    if (status === "ACTIVE") return "success";
    return "default";
  };

  const getStockColor = (quantity) => {
    if (quantity === 0) return "error.main";
    if (quantity <= 10) return "warning.main";
    return "text.primary";
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ----- DELETE (Soft Delete) -----
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.product) return;
    try {
      const res = await adminDeleteProduct(deleteDialog.product.id);
      if (isApiSuccess(res)) {
        toast.success("Xoá sản phẩm thành công (đã chuyển sang ẩn)");
        fetchProducts();
        fetchStats();
      } else {
        toast.error(res.message || "Xoá sản phẩm thất bại");
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Không tìm thấy sản phẩm");
      } else {
        toast.error("Đã xảy ra lỗi, vui lòng thử lại sau");
      }
    } finally {
      setDeleteDialog({ open: false, product: null });
    }
  };

  // ----- TOGGLE STATUS -----
  const handleToggleConfirm = async () => {
    if (!toggleDialog.product) return;
    try {
      const res = await adminToggleProductStatus(toggleDialog.product.id);
      if (isApiSuccess(res)) {
        toast.success("Cập nhật trạng thái thành công");
        // Update in-place without refetching
        setProducts((prev) =>
          prev.map((p) =>
            p.id === toggleDialog.product.id
              ? { ...p, status: res.data?.status || (p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE") }
              : p
          )
        );
        fetchStats();
      } else {
        toast.error(res.message || "Cập nhật trạng thái thất bại");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi khi đổi trạng thái");
    } finally {
      setToggleDialog({ open: false, product: null });
    }
  };

  return (
    <AdminLayout currentPage="Sản phẩm">
      <Box sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={950} color="#1e293b" sx={{ letterSpacing: -0.5, mb: 1 }}>
              📦 Quản Lý Sản Phẩm
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ opacity: 0.8 }}>
              Quản lý danh sách sản phẩm, thêm mới, chỉnh sửa và cập nhật kho hàng
            </Typography>
          </Box>
          <HasPermission permission="PRODUCT_CREATE">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/admin/products/create")}
              sx={{
                bgcolor: "#ff9f1a",
                "&:hover": { bgcolor: "#e68a00" },
                px: 3,
                py: 1.2,
                borderRadius: "10px",
                fontWeight: "bold",
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: "0 4px 12px rgba(255,159,26,0.3)",
              }}
            >
              Thêm Sản Phẩm
            </Button>
          </HasPermission>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, mb: 3 }}>
          {/* Total Products */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(102,126,234,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Tổng sản phẩm
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalProducts}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Active Products */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(17,153,142,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Đang hoạt động
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalActive}
                  </Typography>
                </Box>
                <ActiveIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Inactive Products */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(235,51,73,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Đã ẩn
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalInactive}
                  </Typography>
                </Box>
                <InactiveIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Toolbar — Search & Filter */}
        <Card sx={{ mb: 3, borderRadius: "12px" }}>
          <CardContent>
            <Toolbar sx={{ px: 0, flexWrap: "wrap", gap: 2 }}>
              {/* Search */}
              <TextField
                placeholder="Tìm kiếm sản phẩm..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Category Filter */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Danh mục</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Danh mục"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Producer Filter */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Nhà sản xuất</InputLabel>
                <Select
                  value={producerFilter}
                  label="Nhà sản xuất"
                  onChange={(e) => {
                    setProducerFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {producers.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status Filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={statusFilter}
                  label="Trạng thái"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="active">🟢 Hoạt động</MenuItem>
                  <MenuItem value="inactive">🔴 Đã ẩn</MenuItem>
                </Select>
              </FormControl>
            </Toolbar>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card sx={{ borderRadius: "12px" }}>
          <TableContainer component={Paper} sx={{ position: "relative", minHeight: 400 }}>
            {loading && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  zIndex: 10,
                }}
              >
                <CircularProgress color="primary" />
              </Box>
            )}

            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f7fafc" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>Sản phẩm</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Danh mục / NSX</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    Giá bán
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Tồn kho
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Trạng thái
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Ngày tạo
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <InventoryIcon sx={{ fontSize: 64, color: "#cbd5e0", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          Không tìm thấy sản phẩm nào
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Thử thay đổi bộ lọc hoặc thêm sản phẩm mới
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow
                      key={product.id}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "#f8fafc" },
                        transition: "background-color 0.15s",
                      }}
                    >
                      {/* Product Name & Image */}
                      <TableCell onClick={() => navigate(`/admin/products/${product.id}`)}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar
                            src={product.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='9' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Img%3C/text%3E%3C/svg%3E"}
                            alt={product.name}
                            sx={{ width: 50, height: 50, borderRadius: "8px" }}
                            variant="rounded"
                          />
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {product.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {product.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Category & Producer */}
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {product.productType?.name || "—"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          NSX: {product.producer?.name || "—"}
                        </Typography>
                      </TableCell>

                      {/* Price */}
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                          {formatPrice(product.basePrice)}
                        </Typography>
                      </TableCell>

                      {/* Stock */}
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: getStockColor(product.totalQuantity),
                            fontWeight: product.totalQuantity <= 10 ? "bold" : "normal",
                          }}
                        >
                          {product.totalQuantity ?? 0}
                          {product.totalQuantity === 0 && (
                            <Typography variant="caption" display="block" color="error.main">
                              Hết hàng
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        <Chip
                          label={product.status === "ACTIVE" ? "Hoạt động" : "Đã ẩn"}
                          size="small"
                          color={getStatusColor(product.status)}
                          sx={{
                            fontWeight: "bold",
                            minWidth: 90,
                          }}
                        />
                      </TableCell>

                      {/* Created Date */}
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          {product.createdAt
                            ? new Date(product.createdAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => navigate(`/admin/products/${product.id}`)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <HasPermission permission="PRODUCT_EDIT">
                            <Tooltip title="Chỉnh sửa">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => navigate(`/admin/products/${product.id}`)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </HasPermission>

                          <HasPermission permission="PRODUCT_MANAGE">
                            <Tooltip title={product.status === "ACTIVE" ? "Tắt hiển thị" : "Bật hiển thị"}>
                              <IconButton
                                size="small"
                                color={product.status === "ACTIVE" ? "success" : "default"}
                                onClick={() => setToggleDialog({ open: true, product })}
                              >
                                {product.status === "ACTIVE" ? (
                                  <ToggleOnIcon fontSize="small" />
                                ) : (
                                  <ToggleOffIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </HasPermission>

                          <HasPermission permission="PRODUCT_DELETE">
                            <Tooltip title="Xoá sản phẩm (ẩn)">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteDialog({ open: true, product })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </HasPermission>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
            labelRowsPerPage="Số dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} của ${count !== -1 ? count : `hơn ${to}`}`
            }
          />
        </Card>
      </Box>

      {/* ═══ Delete Confirmation Dialog ═══ */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, product: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#e53e3e" }}>
          ⚠️ Xác nhận xoá sản phẩm
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc muốn ẩn sản phẩm{" "}
            <strong>{deleteDialog.product?.name}</strong>?
            <br />
            <br />
            Sản phẩm sẽ chuyển sang trạng thái <strong>INACTIVE</strong> và không hiển thị
            trên trang khách hàng. Bạn có thể bật lại bất cứ lúc nào.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteDialog({ open: false, product: null })} sx={{ textTransform: "none" }}>
            Huỷ bỏ
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ textTransform: "none" }}>
            Xoá sản phẩm
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Toggle Status Confirmation Dialog ═══ */}
      <Dialog
        open={toggleDialog.open}
        onClose={() => setToggleDialog({ open: false, product: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {toggleDialog.product?.status === "ACTIVE"
            ? "🔴 Tắt hiển thị sản phẩm?"
            : "🟢 Bật hiển thị sản phẩm?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleDialog.product?.status === "ACTIVE"
              ? `Sản phẩm "${toggleDialog.product?.name}" sẽ bị ẩn khỏi trang khách hàng.`
              : `Sản phẩm "${toggleDialog.product?.name}" sẽ được hiển thị trên trang khách hàng.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setToggleDialog({ open: false, product: null })} sx={{ textTransform: "none" }}>
            Huỷ bỏ
          </Button>
          <Button
            variant="contained"
            color={toggleDialog.product?.status === "ACTIVE" ? "warning" : "success"}
            onClick={handleToggleConfirm}
            sx={{ textTransform: "none" }}
          >
            {toggleDialog.product?.status === "ACTIVE" ? "Tắt hiển thị" : "Bật hiển thị"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default ProductManagementPage;
