import {
  Add as AddIcon,
  Article as ArticleIcon,
  Delete as DeleteIcon,
  VisibilityOff as DraftIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Publish as PublishIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { isApiSuccess } from "../../utils/apiResponse";
import { getPosts, createPost, updatePost, deletePost } from "../../services/postService";

const CATEGORY_OPTIONS = ["Review", "Top List", "Guide", "Comparison", "Technology"];
const STATUS_OPTIONS = [
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
  { value: "scheduled", label: "Đã lên lịch" },
];

const emptyForm = () => ({
  title: "",
  excerpt: "",
  author: "KhangAdmin",
  category: "Review",
  status: "draft",
  publishDate: "",
  thumbnail: "",
  tags: "",
});

const PostManagementPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPosts({
        page,
        size: rowsPerPage,
        keyword: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      });
      setPosts(data?.content || []);
      setTotalElements(data?.totalElements ?? 0);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Không thể tải danh sách bài viết");
      setPosts([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const categories = [...new Set([...CATEGORY_OPTIONS, ...posts.map((p) => p.category).filter(Boolean)])];

  const getStatusConfig = (status) => {
    const map = {
      published: { label: "Đã xuất bản", bgcolor: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", icon: <PublishIcon sx={{ fontSize: 13 }} /> },
      draft: { label: "Bản nháp", bgcolor: "#f8fafc", color: "#64748b", border: "#e2e8f0", icon: <DraftIcon sx={{ fontSize: 13 }} /> },
      scheduled: { label: "Đã lên lịch", bgcolor: "#eff6ff", color: "#2563eb", border: "#bfdbfe", icon: <ScheduleIcon sx={{ fontSize: 13 }} /> },
    };
    return map[status] || { label: status || "—", bgcolor: "#fef2f2", color: "#dc2626", border: "#fecaca", icon: <ArticleIcon sx={{ fontSize: 13 }} /> };
  };

  const getCategoryColor = (cat) => {
    const map = { Review: "#fef9c3", "Top List": "#ede9fe", Guide: "#e0f2fe", Comparison: "#fce7f3", Technology: "#dcfce7" };
    const colorMap = { Review: "#a16207", "Top List": "#7c3aed", Guide: "#0369a1", Comparison: "#be185d", Technology: "#15803d" };
    return { bg: map[cat] || "#f1f5f9", color: colorMap[cat] || "#475569" };
  };

  const formatDate = (dateStr) => (!dateStr ? "—" : new Date(dateStr).toLocaleDateString("vi-VN"));
  const formatViews = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v ?? 0));

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (post) => {
    setEditingId(post.id);
    setFormData({
      title: post.title || "",
      excerpt: post.excerpt || "",
      author: post.author || "",
      category: post.category || "Review",
      status: post.status || "draft",
      publishDate: post.publishDate || "",
      thumbnail: post.thumbnail || "",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    });
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    title: formData.title.trim(),
    excerpt: formData.excerpt,
    author: formData.author,
    category: formData.category,
    status: formData.status,
    publishDate: formData.publishDate || null,
    thumbnail: formData.thumbnail,
    tags: formData.tags
      ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài viết");
      return;
    }
    try {
      const payload = buildPayload();
      const res = editingId
        ? await updatePost(editingId, payload)
        : await createPost(payload);
      if (isApiSuccess(res)) {
        toast.success(res.message || "Lưu thành công");
        setDialogOpen(false);
        loadPosts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu bài viết");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa bài viết này?")) return;
    try {
      const res = await deletePost(id);
      if (isApiSuccess(res)) {
        toast.success(res.message || "Đã xóa bài viết");
        loadPosts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa bài viết");
    }
  };

  return (
    <AdminLayout currentPage="Bài viết">
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>📝 Quản Lý Bài Viết</Typography>
            <Typography variant="body1" color="text.secondary">Quản lý các bài viết, tin tức và blog trên website</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, px: 3, py: 1.2, borderRadius: "10px", fontWeight: "bold", textTransform: "none" }}>
            Tạo Bài Viết
          </Button>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, mb: 3 }}>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ opacity: 0.85 }}>Tổng bài viết</Typography>
              <Typography variant="h3" fontWeight="bold">{totalElements}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", color: "white" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ opacity: 0.85 }}>Đã xuất bản (trang)</Typography>
              <Typography variant="h3" fontWeight="bold">{publishedCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ opacity: 0.85 }}>Bản nháp (trang)</Typography>
              <Typography variant="h3" fontWeight="bold">{draftCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ opacity: 0.85 }}>Lượt xem (trang)</Typography>
              <Typography variant="h3" fontWeight="bold">{formatViews(totalViews)}</Typography>
            </CardContent>
          </Card>
        </Box>

        <Card sx={{ mb: 3, borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <TextField fullWidth placeholder="Tìm kiếm bài viết, tác giả..." size="small"
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#94a3b8" }} /></InputAdornment>, sx: { borderRadius: 2 } }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
                  <MenuItem value="all">Tất cả danh mục</MenuItem>
                  {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
                  <MenuItem value="all">Tất cả trạng thái</MenuItem>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Bài viết</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Tác giả</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Danh mục</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Ngày đăng</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Lượt xem</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: "#ff9f1a" }} />
                    </TableCell>
                  </TableRow>
                ) : posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">Chưa có bài viết — bấm &quot;Tạo Bài Viết&quot; để thêm mới</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post, idx) => {
                    const sc = getStatusConfig(post.status);
                    const catColor = getCategoryColor(post.category);
                    const tags = post.tags || [];
                    return (
                      <TableRow key={post.id} hover sx={{ bgcolor: idx % 2 === 0 ? "white" : "#fafbfc" }}>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Typography variant="subtitle2" fontWeight="700">{post.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{post.excerpt}</Typography>
                          <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {tags.slice(0, 3).map((tag) => (
                              <Chip key={tag} label={`#${tag}`} size="small" sx={{ fontSize: "0.65rem", height: 18 }} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">{post.author || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={post.category || "—"} size="small" sx={{ bgcolor: catColor.bg, color: catColor.color, fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip icon={sc.icon} label={sc.label} size="small" sx={{ bgcolor: sc.bgcolor, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">{formatDate(post.publishDate)}</TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="700">{formatViews(post.views)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="warning" onClick={() => openEdit(post)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(post.id)}><DeleteIcon fontSize="small" /></IconButton>
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
            count={totalElements}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Số dòng:"
          />
        </Card>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField label="Tiêu đề *" fullWidth value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            <TextField label="Mô tả ngắn" fullWidth multiline rows={2} value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} />
            <TextField label="Tác giả" fullWidth value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Danh mục</InputLabel>
              <Select label="Danh mục" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select label="Trạng thái" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Ngày đăng (YYYY-MM-DD)" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={formData.publishDate} onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })} />
            <TextField label="Ảnh thumbnail (URL)" fullWidth value={formData.thumbnail} onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })} />
            <TextField label="Tags (phân cách bằng dấu phẩy)" fullWidth value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button variant="contained" onClick={handleSave} sx={{ bgcolor: "#ff9f1a" }}>Lưu</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default PostManagementPage;
