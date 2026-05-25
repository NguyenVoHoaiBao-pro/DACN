import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Cached as CachedIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Category as CategoryIcon,
  CheckCircleOutline as ActiveIcon,
  AccountTree as TreeIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
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
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { adminGetCategories, adminToggleCategoryStatus } from "../../services/masterService";

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [togglingId, setTogglingId] = useState(null);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminGetCategories();
      const normalized = (data || []).map((c) => ({
        ...c,
        status: c.status ?? (c.isActive === false ? "inactive" : "active"),
      }));
      setCategories(normalized);
    } catch (error) {
      toast.error("Không thể tải danh sách danh mục");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle Toggle Status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setTogglingId(id);
      const res = await adminToggleCategoryStatus(id);
      if (res.success) {
        toast.success(res.message || "Cập nhật trạng thái thành công");
        // Update local state
        setCategories(prev =>
          prev.map(cat =>
            cat.id === id ? { ...cat, status: cat.status === 'active' ? 'inactive' : 'active' } : cat
          )
        );
      } else {
        toast.error(res.message || "Cập nhật thất bại");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật");
    } finally {
      setTogglingId(null);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((category) => {
    const nameMatch = (category.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = (category.code || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSearch = nameMatch || codeMatch;
    
    const matchesStatus =
      statusFilter === "all" || category.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get status config
  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return { label: "Đang hoạt động", color: "success", icon: <CheckCircleIcon fontSize="small" /> };
      case "inactive":
        return { label: "Đã ẩn", color: "default", icon: <CancelIcon fontSize="small" /> };
      default:
        return { label: "Không xác định", color: "error", icon: null };
    }
  };

  // Recursive check for parent name if needed, or simple lookup
  const getParentName = (parentId) => {
    if (!parentId) return "Danh mục gốc";
    const parent = categories.find((cat) => cat.id === parentId);
    return parent ? parent.name : `ID: ${parentId}`;
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <AdminLayout currentPage="Danh mục">
      <Box sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Quản Lý Danh Mục
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Tổ chức sản phẩm theo cấp bậc, quản lý trạng thái hiển thị và SEO
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<CachedIcon />}
            onClick={fetchCategories}
            disabled={loading}
          >
            Làm mới
          </Button>
        </Box>

        {/* Toolbar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Toolbar sx={{ px: 0, gap: 2 }}>
              {/* Search */}
              <TextField
                placeholder="Tìm tên hoặc mã danh mục..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 350 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Status Filter */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={statusFilter}
                  label="Trạng thái"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  startAdornment={<FilterIcon sx={{ mr: 1, fontSize: 20, color: 'action.active' }} />}
                >
                  <MenuItem value="all">Tất cả trạng thái</MenuItem>
                  <MenuItem value="active">Đang hoạt động</MenuItem>
                  <MenuItem value="inactive">Đã ẩn (Tạm ngưng)</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ flexGrow: 1 }} />

              {/* Add Category Button */}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{
                  bgcolor: "#ff9f1a",
                  "&:hover": { bgcolor: "#e68a00" },
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(255,159,26,0.3)"
                }}
              >
                Thêm Mới
              </Button>
            </Toolbar>
          </CardContent>
        </Card>

        {/* Stats Cards - Matching Product Management Style */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 3, mb: 3 }}>
          {/* Total Categories */}
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
                    Tổng số danh mục
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? <CircularProgress size={36} color="inherit" /> : categories.length}
                  </Typography>
                </Box>
                <CategoryIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Active Categories */}
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
                    {loading ? <CircularProgress size={36} color="inherit" /> : categories.filter(c => c.status === 'active').length}
                  </Typography>
                </Box>
                <ActiveIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Root Categories */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(245,87,108,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Danh mục cấp gốc
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? <CircularProgress size={36} color="inherit" /> : categories.filter(c => !c.parentId).length}
                  </Typography>
                </Box>
                <TreeIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Categories Table */}
        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#F8F9FA" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Thông tin danh mục</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Slug (Mã)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Phân cấp</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Bật/Tắt</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <CircularProgress color="warning" />
                      <Typography sx={{ mt: 2 }} color="text.secondary">Đang lấy dữ liệu từ Backend...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Typography color="text.secondary">Không tìm thấy danh mục nào phù hợp</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((category) => {
                      const statusConfig = getStatusConfig(category.status);
                      const isToggling = togglingId === category.id;
                      
                      return (
                        <TableRow key={category.id} hover sx={{ transition: 'all 0.2s' }}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar
                                src={category.iconUrl || category.image}
                                alt={category.name}
                                sx={{ width: 44, height: 44, bgcolor: '#f0f0f0' }}
                                variant="rounded"
                              >
                                {category.name?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                                  {category.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  ID: #{category.id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={category.code || category.slug || '—'} 
                              size="small" 
                              sx={{ fontFamily: 'monospace', fontWeight: 'bold', bgcolor: '#eee' }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getParentName(category.parentId)}
                              size="small"
                              variant="outlined"
                              color={category.parentId ? "primary" : "default"}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={statusConfig.label}
                              size="small"
                              color={statusConfig.color}
                              icon={statusConfig.icon}
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {isToggling ? (
                              <CircularProgress size={24} color="warning" />
                            ) : (
                              <Switch
                                checked={category.status === 'active'}
                                onChange={() => handleToggleStatus(category.id, category.status)}
                                color="success"
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                              <IconButton size="small" color="primary" title="Xem chi tiết">
                                <ViewIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="warning" title="Chỉnh sửa">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" title="Xóa">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredCategories.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Hiển thị:"
          />
        </Card>
      </Box>
    </AdminLayout>
  );
};

export default CategoryManagementPage;
