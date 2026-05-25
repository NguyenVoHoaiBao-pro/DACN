import { useState, useEffect } from "react";
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Tooltip, CircularProgress, Chip, Avatar, Stack, Switch,
  MenuItem, Select, FormControl, TablePagination, InputAdornment, Skeleton
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Public as WebsiteIcon,
  Flag as CountryIcon,
  Business as ProducerIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  adminGetProducers, adminCreateProducer, adminUpdateProducer,
  adminDeleteProducer, adminToggleProducerStatus
} from "../../services/producerService";

const ProducerManagementPage = () => {
  const [producers, setProducers] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({ id: null, name: "", code: "", logoUrl: "", description: "", country: "", website: "", isActive: true });

  useEffect(() => { fetchProducers(); }, [page, size, keyword, sortBy, sortDir]);

  const fetchProducers = async () => {
    setLoading(true);
    try {
      const res = await adminGetProducers({ page, size, keyword: keyword || undefined, sortBy, sortDir });
      setProducers(res.content || []);
      setTotalElements(res.totalElements || 0);
    } catch { toast.error("Lỗi khi tải danh sách thương hiệu"); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (mode, data = null) => {
    setModalMode(mode);
    setFormData(mode === "edit" && data ? { ...data } : { id: null, name: "", code: "", logoUrl: "", description: "", country: "", website: "", isActive: true });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : (name === "code" ? value.toUpperCase().replace(/\s+/g, "") : value) }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) return toast.warning("Tên và Mã thương hiệu là bắt buộc");
    try {
      if (modalMode === "add") { await adminCreateProducer(formData); toast.success("Thêm thương hiệu mới thành công"); }
      else { await adminUpdateProducer(formData.id, formData); toast.success("Cập nhật thương hiệu thành công"); }
      setModalOpen(false);
      fetchProducers();
    } catch (error) { toast.error(error.response?.data?.message || "Xảy ra lỗi khi lưu dữ liệu"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Nếu thương hiệu có sản phẩm liên kết, hệ thống sẽ chuyển sang Ngừng hoạt động thay vì xóa. Bạn vẫn muốn tiếp tục?")) return;
    try { await adminDeleteProducer(id); toast.success("Đã xử lý thương hiệu"); fetchProducers(); }
    catch { toast.error("Lỗi khi xóa thương hiệu"); }
  };

  const handleToggle = async (id) => {
    setProducers(producers.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    try { await adminToggleProducerStatus(id); toast.success("Đã thay đổi trạng thái"); }
    catch { fetchProducers(); toast.error("Lỗi khi thay đổi trạng thái"); }
  };

  const activeCount = producers.filter(p => p.isActive).length;

  return (
    <AdminLayout currentPage="Sản phẩm / Thương hiệu">
      <Box sx={{ p: 3 }}>

        {/* ═══ HEADER ═══ */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>🏭 Quản Lý Thương Hiệu</Typography>
            <Typography variant="body1" color="text.secondary">Quản lý danh sách nhà sản xuất và đối tác thương hiệu</Typography>
          </Box>
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => handleOpenModal("add")}
            sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, px: 3, py: 1.2, borderRadius: "10px", fontWeight: "bold", textTransform: "none", fontSize: "1rem", boxShadow: "0 4px 12px rgba(255,159,26,0.3)" }}
          >
            Thêm Thương Hiệu
          </Button>
        </Box>

        {/* ═══ STAT CARDS ═══ */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, mb: 3 }}>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", boxShadow: "0 8px 32px rgba(102,126,234,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Tổng thương hiệu</Typography>
                  <Typography variant="h3" fontWeight="bold">{loading ? <CircularProgress size={36} color="inherit" /> : totalElements}</Typography>
                </Box>
                <ProducerIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", color: "white", boxShadow: "0 8px 32px rgba(17,153,142,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Đang hoạt động</Typography>
                  <Typography variant="h3" fontWeight="bold">{activeCount}</Typography>
                </Box>
                <ActiveIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white", boxShadow: "0 8px 32px rgba(245,158,11,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Ngừng hoạt động</Typography>
                  <Typography variant="h3" fontWeight="bold">{producers.length - activeCount}</Typography>
                </Box>
                <InactiveIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ═══ TOOLBAR ═══ */}
        <Card sx={{ mb: 3, borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <TextField
                fullWidth placeholder="Tìm kiếm tên, mã, quốc gia..." size="small"
                value={keyword} onChange={(e) => setKeyword(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#94a3b8" }} /></InputAdornment>, sx: { borderRadius: 2, bgcolor: "white" } }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} sx={{ borderRadius: 2, bgcolor: "white" }}>
                  <MenuItem value="name">Tên thương hiệu</MenuItem>
                  <MenuItem value="code">Mã Code</MenuItem>
                  <MenuItem value="country">Quốc gia</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select value={sortDir} onChange={(e) => setSortDir(e.target.value)} sx={{ borderRadius: 2, bgcolor: "white" }}>
                  <MenuItem value="asc">Tăng dần</MenuItem>
                  <MenuItem value="desc">Giảm dần</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* ═══ TABLE ═══ */}
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Thương hiệu</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Mã Code</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Quốc gia</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Website</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ px: 3 }}><Stack direction="row" spacing={2} alignItems="center"><Skeleton variant="circular" width={40} height={40} /><Skeleton variant="text" width={150} /></Stack></TableCell>
                      {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
                    </TableRow>
                  ))
                ) : producers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}>
                      <ProducerIcon sx={{ fontSize: 56, color: "#cbd5e0", mb: 1 }} />
                      <Typography variant="h6" fontWeight="700" color="text.secondary">Chưa có thương hiệu nào</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  producers.map((p, idx) => (
                    <TableRow key={p.id} hover sx={{ bgcolor: idx % 2 === 0 ? "white" : "#fafbfc", "&:hover": { bgcolor: "#f5f3ff" }, transition: "background 0.15s" }}>
                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar src={p.logoUrl} sx={{ bgcolor: "#f1f5f9", border: "1px solid #e2e8f0", width: 40, height: 40 }}>
                            {!p.logoUrl && <ProducerIcon sx={{ color: "#64748b", fontSize: 20 }} />}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="700" color="#1e293b">{p.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.description?.substring(0, 45) || "Chưa có mô tả"}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip label={p.code} size="small" sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontFamily: "monospace" }} />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CountryIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                          <Typography variant="body2" fontWeight="600">{p.country || "Toàn cầu"}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        {p.website ? (
                          <Tooltip title={p.website}>
                            <IconButton size="small" component="a" href={p.website} target="_blank" sx={{ bgcolor: "#eff6ff", color: "#2563eb", "&:hover": { bgcolor: "#bfdbfe" } }}>
                              <WebsiteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Chip
                          label={p.isActive ? "Hoạt động" : "Ngừng"}
                          size="small"
                          onClick={() => handleToggle(p.id)}
                          sx={{ cursor: "pointer", fontWeight: "700", bgcolor: p.isActive ? "#f0fdf4" : "#fef2f2", color: p.isActive ? "#16a34a" : "#dc2626", border: `1px solid ${p.isActive ? "#bbf7d0" : "#fecaca"}`, "&:hover": { opacity: 0.8 } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2, px: 3 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" onClick={() => handleOpenModal("edit", p)} color="warning"><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]} component="div"
            count={totalElements} rowsPerPage={size} page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
            labelRowsPerPage="Số dòng:" sx={{ borderTop: "1px solid #f1f5f9" }}
          />
        </Card>
      </Box>

      {/* ═══ MODAL ═══ */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 4, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)" } }}>
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem", pb: 0.5 }}>
          {modalMode === "add" ? "➕ Thêm Thương Hiệu Mới" : "✏️ Chỉnh Sửa Thương Hiệu"}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            <Box>
              <TextField fullWidth label="Tên thương hiệu *" name="name" value={formData.name} onChange={handleInputChange} placeholder="Apple, Samsung, Sony..." sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2 } }} />
              <TextField fullWidth label="Mã Code *" name="code" value={formData.code} onChange={handleInputChange} placeholder="APPLE, SAMSUNG" disabled={modalMode === "edit"} helperText="Mã duy nhất, không thể thay đổi sau khi tạo" sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2 } }} />
              <TextField fullWidth label="URL Logo" name="logoUrl" value={formData.logoUrl} onChange={handleInputChange} placeholder="https://example.com/logo.png" sx={{ mb: 2.5 }} InputProps={{ startAdornment: <InputAdornment position="start"><ImageIcon sx={{ color: "#94a3b8" }} /></InputAdornment>, sx: { borderRadius: 2 } }} />
              {formData.logoUrl && (
                <Box sx={{ mb: 2, p: 2, border: "1px dashed #cbd5e1", borderRadius: 2, display: "flex", justifyContent: "center" }}>
                  <img src={formData.logoUrl} alt="Logo Preview" style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }} />
                </Box>
              )}
            </Box>
            <Box>
              <TextField fullWidth label="Quốc gia" name="country" value={formData.country} onChange={handleInputChange} placeholder="Mỹ, Hàn Quốc, Nhật Bản..." sx={{ mb: 2.5 }} InputProps={{ startAdornment: <InputAdornment position="start"><CountryIcon sx={{ color: "#94a3b8" }} /></InputAdornment>, sx: { borderRadius: 2 } }} />
              <TextField fullWidth label="Website chính thức" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://www.brand.com" sx={{ mb: 2.5 }} InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: "#94a3b8" }} /></InputAdornment>, sx: { borderRadius: 2 } }} />
              <TextField fullWidth label="Mô tả" name="description" multiline rows={4} value={formData.description} onChange={handleInputChange} placeholder="Mô tả ngắn về thương hiệu..." sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2 } }} />
              <Box sx={{ display: "flex", alignItems: "center", p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Switch checked={formData.isActive} onChange={handleInputChange} name="isActive" color="success" />
                <Typography variant="body2" sx={{ fontWeight: "bold", color: formData.isActive ? "#16a34a" : "#64748b" }}>
                  {formData.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ fontWeight: "600", textTransform: "none", color: "#64748b" }}>Huỷ bỏ</Button>
          <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2, bgcolor: "#ff9f1a", fontWeight: "bold", px: 3, textTransform: "none", "&:hover": { bgcolor: "#e68a00" }, boxShadow: "0 4px 12px rgba(255,159,26,0.3)" }}>
            {modalMode === "add" ? "Thêm thương hiệu" : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default ProducerManagementPage;
