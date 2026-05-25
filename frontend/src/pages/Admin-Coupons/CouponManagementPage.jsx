import { useState, useEffect } from "react";
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Tooltip, CircularProgress, Chip, Avatar, Stack, Switch,
  MenuItem, Select, FormControl, TablePagination, InputAdornment, FormControlLabel
} from "@mui/material";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ConfirmationNumber as CouponIcon, Search as SearchIcon,
  AccessTime as TimeIcon, MonetizationOn as MoneyIcon, Percent as PercentIcon,
  CheckCircle as ActiveIcon, Block as InactiveIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon,
  adminDeleteCoupon, adminToggleCouponStatus
} from "../../services/couponService";

const fmtDT = (date) => {
  const d = new Date(date), pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const emptyForm = () => ({
  code: "", name: "", description: "", discountType: "PERCENT", discountValue: 0,
  minOrderValue: 0, maxDiscountAmount: 0, usageLimit: null,
  dateStart: fmtDT(new Date()),
  dateEnd: fmtDT(new Date(Date.now() + 7*86400000)),
  isActive: true
});

const CouponManagementPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState(emptyForm());

  useEffect(() => { fetchCoupons(); }, [page, size, keyword, isActiveFilter, sortBy, sortDir]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminGetCoupons({ page, size, keyword: keyword || undefined, isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "true", sortBy, sortDir });
      setCoupons(res.content || []);
      setTotalElements(res.totalElements || 0);
    } catch { toast.error("Lỗi khi tải danh sách mã giảm giá"); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (mode, data = null) => {
    setModalMode(mode);
    setFormData(mode === "edit" && data ? { ...data } : emptyForm());
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : (name === "code" ? value.toUpperCase() : value) }));
  };

  const handleSave = async () => {
    if (!formData.code || !formData.discountValue || !formData.dateStart || !formData.dateEnd)
      return toast.warning("Vui lòng nhập đầy đủ các trường bắt buộc");
    try {
      if (modalMode === "add") { await adminCreateCoupon(formData); toast.success("Tạo mã giảm giá thành công"); }
      else { await adminUpdateCoupon(formData.id, formData); toast.success("Cập nhật thành công"); }
      setModalOpen(false); fetchCoupons();
    } catch (e) { toast.error(e.response?.data?.message || "Lỗi khi lưu"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa mã này?")) return;
    try { await adminDeleteCoupon(id); toast.success("Đã xóa mã giảm giá"); fetchCoupons(); }
    catch { toast.error("Lỗi khi xóa"); }
  };

  const handleToggle = async (id) => {
    try { await adminToggleCouponStatus(id); toast.success("Đã thay đổi trạng thái"); fetchCoupons(); }
    catch { toast.error("Lỗi khi thay đổi trạng thái"); }
  };

  const activeCount = coupons.filter(c => c.isActive).length;
  const percentCount = coupons.filter(c => c.discountType === "PERCENT").length;

  return (
    <AdminLayout currentPage="Marketing / Mã giảm giá">
      <Box sx={{ p: 3 }}>
        {/* HEADER */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>🎟️ Quản Lý Mã Giảm Giá</Typography>
            <Typography variant="body1" color="text.secondary">Quản lý các chương trình khuyến mãi và mã ưu đãi</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal("add")}
            sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, px: 3, py: 1.2, borderRadius: "10px", fontWeight: "bold", textTransform: "none", fontSize: "1rem", boxShadow: "0 4px 12px rgba(255,159,26,0.3)" }}>
            Tạo Mã Giảm Giá
          </Button>
        </Box>

        {/* STAT CARDS */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, mb: 3 }}>
          {[
            { label: "Tổng mã", value: totalElements, gradient: "linear-gradient(135deg,#667eea,#764ba2)", shadow: "rgba(102,126,234,.3)", Icon: CouponIcon },
            { label: "Đang kích hoạt", value: activeCount, gradient: "linear-gradient(135deg,#11998e,#38ef7d)", shadow: "rgba(17,153,142,.3)", Icon: ActiveIcon },
            { label: "Đã tắt", value: coupons.length - activeCount, gradient: "linear-gradient(135deg,#f093fb,#f5576c)", shadow: "rgba(245,87,108,.3)", Icon: InactiveIcon },
            { label: "Giảm % (trang này)", value: percentCount, gradient: "linear-gradient(135deg,#f59e0b,#d97706)", shadow: "rgba(245,158,11,.3)", Icon: PercentIcon },
          ].map(({ label, value, gradient, shadow, Icon }) => (
            <Card key={label} sx={{ borderRadius: "16px", background: gradient, color: "white", boxShadow: `0 8px 32px ${shadow}`, transition: "transform .2s", "&:hover": { transform: "translateY(-4px)" } }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box><Typography variant="overline" sx={{ opacity: .85, letterSpacing: 1 }}>{label}</Typography><Typography variant="h3" fontWeight="bold">{loading ? <CircularProgress size={36} color="inherit" /> : value}</Typography></Box>
                  <Icon sx={{ fontSize: 56, opacity: .3 }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* TOOLBAR */}
        <Card sx={{ mb: 3, borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <TextField fullWidth placeholder="Tìm theo mã hoặc tên..." size="small" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#94a3b8" }} /></InputAdornment>, sx: { borderRadius: 2, bgcolor: "white" } }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select value={isActiveFilter} onChange={(e) => setIsActiveFilter(e.target.value)} sx={{ borderRadius: 2, bgcolor: "white" }}>
                  <MenuItem value="all">Tất cả</MenuItem><MenuItem value="true">Đang bật</MenuItem><MenuItem value="false">Đã tắt</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} sx={{ borderRadius: 2, bgcolor: "white" }}>
                  <MenuItem value="createdAt">Ngày tạo</MenuItem>
                  <MenuItem value="code">Mã Code</MenuItem>
                  <MenuItem value="discountValue">Giá trị</MenuItem>
                  <MenuItem value="usedCount">Đã dùng</MenuItem>
                  <MenuItem value="dateEnd">Hết hạn</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,.06)", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {["Mã / Tên", "Giá trị giảm", "Thời hạn", "Lượt sử dụng", "Trạng thái", "Thao tác"].map((h, i) => (
                    <TableCell key={h} align={i >= 4 ? "center" : "left"} sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, ...(i === 0 && { px: 3 }), ...(i === 5 && { px: 3 }) }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}><CircularProgress color="warning" /><Typography sx={{ mt: 2, color: "#64748b", fontWeight: 600 }}>Đang tải...</Typography></TableCell></TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}><CouponIcon sx={{ fontSize: 56, color: "#cbd5e0", mb: 1 }} /><Typography variant="h6" fontWeight="700" color="text.secondary">Chưa có mã giảm giá nào</Typography></TableCell></TableRow>
                ) : coupons.map((c, idx) => (
                  <TableRow key={c.id} hover sx={{ bgcolor: idx % 2 === 0 ? "white" : "#fafbfc", "&:hover": { bgcolor: "#f5f3ff" }, transition: "background .15s" }}>
                    <TableCell sx={{ py: 2, px: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: "#fff3e0", color: "#ff9f1a", fontWeight: "bold", width: 36, height: 36, fontSize: ".9rem" }}>{c.code.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="800" color="#1e293b" sx={{ fontFamily: "monospace" }}>{c.code}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.name || "Không có tên"}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip icon={c.discountType === "PERCENT" ? <PercentIcon sx={{ fontSize: ".9rem !important" }} /> : <MoneyIcon sx={{ fontSize: ".9rem !important" }} />}
                        label={`${c.discountValue}${c.discountType === "PERCENT" ? "%" : " đ"}`} size="small"
                        sx={{ fontWeight: "bold", bgcolor: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }} />
                      {c.minOrderValue > 0 && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: .5 }}>Tối thiểu: {c.minOrderValue.toLocaleString("vi-VN")} đ</Typography>}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Stack spacing={.3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: .8 }}><TimeIcon sx={{ fontSize: 13, color: "#16a34a" }} /><Typography variant="caption" fontWeight="600">Bắt đầu: {c.dateStart}</Typography></Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: .8 }}><TimeIcon sx={{ fontSize: 13, color: "#dc2626" }} /><Typography variant="caption" fontWeight="600">Kết thúc: {c.dateEnd}</Typography></Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" fontWeight="800">{c.usedCount} / {c.usageLimit || "∞"}</Typography>
                      <Box sx={{ width: "100%", height: 5, bgcolor: "#f1f5f9", borderRadius: 3, overflow: "hidden", mt: .5 }}>
                        <Box sx={{ width: c.usageLimit ? `${Math.min((c.usedCount/c.usageLimit)*100, 100)}%` : "0%", height: "100%", bgcolor: "#ff9f1a", borderRadius: 3 }} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Chip label={c.isActive ? "Đang bật" : "Đã tắt"} size="small" onClick={() => handleToggle(c.id)}
                        sx={{ cursor: "pointer", fontWeight: "700", bgcolor: c.isActive ? "#f0fdf4" : "#fef2f2", color: c.isActive ? "#16a34a" : "#dc2626", border: `1px solid ${c.isActive ? "#bbf7d0" : "#fecaca"}`, "&:hover": { opacity: .8 } }} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2, px: 3 }}>
                      <Stack direction="row" spacing={.5} justifyContent="center">
                        <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => handleOpenModal("edit", c)} color="warning"><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Xóa"><IconButton size="small" color="error" onClick={() => handleDelete(c.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={totalElements} rowsPerPage={size} page={page}
            onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
            labelRowsPerPage="Số dòng:" sx={{ borderTop: "1px solid #f1f5f9" }} />
        </Card>
      </Box>

      {/* MODAL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 4, boxShadow: "0 25px 50px -12px rgba(0,0,0,.2)" } }}>
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem", pb: .5 }}>
          {modalMode === "add" ? "➕ Tạo Mã Giảm Giá Mới" : "✏️ Chỉnh Sửa Mã Giảm Giá"}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            <Box>
              <TextField fullWidth label="Mã Coupon *" name="code" value={formData.code} onChange={handleChange} placeholder="VD: SUMMER2024" disabled={modalMode === "edit"} sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2, fontFamily: "monospace" } }} />
              <TextField fullWidth label="Tên hiển thị" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Sale Hè 20%" sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2 } }} />
              <TextField fullWidth label="Mô tả / Điều kiện" name="description" multiline rows={3} value={formData.description} onChange={handleChange} sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2 } }} />
              <FormControl fullWidth sx={{ mb: 2.5 }}>
                <Select name="discountType" value={formData.discountType} onChange={handleChange} sx={{ borderRadius: 2 }}>
                  <MenuItem value="PERCENT">Giảm theo % (Phần trăm)</MenuItem>
                  <MenuItem value="FIXED">Giảm cố định (VNĐ)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <TextField fullWidth label="Giá trị giảm *" name="discountValue" type="number" value={formData.discountValue} onChange={handleChange} sx={{ mb: 2.5 }} InputProps={{ endAdornment: <InputAdornment position="end">{formData.discountType === "PERCENT" ? "%" : "đ"}</InputAdornment>, sx: { borderRadius: 2 } }} />
              <TextField fullWidth label="Đơn hàng tối thiểu" name="minOrderValue" type="number" value={formData.minOrderValue} onChange={handleChange} sx={{ mb: 2.5 }} InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment>, sx: { borderRadius: 2 } }} />
              {formData.discountType === "PERCENT" && <TextField fullWidth label="Giảm tối đa (đ)" name="maxDiscountAmount" type="number" value={formData.maxDiscountAmount} onChange={handleChange} sx={{ mb: 2.5 }} InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment>, sx: { borderRadius: 2 } }} />}
              <TextField fullWidth label="Giới hạn sử dụng (bỏ trống = không giới hạn)" name="usageLimit" type="number" value={formData.usageLimit || ""} onChange={handleChange} sx={{ mb: 2.5 }} InputProps={{ sx: { borderRadius: 2 } }} />
              <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
                <TextField fullWidth label="Ngày bắt đầu" name="dateStart" value={formData.dateStart} onChange={handleChange} InputProps={{ sx: { borderRadius: 2 } }} />
                <TextField fullWidth label="Ngày kết thúc" name="dateEnd" value={formData.dateEnd} onChange={handleChange} InputProps={{ sx: { borderRadius: 2 } }} />
              </Box>
              <FormControlLabel control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" color="success" />}
                label={<Typography fontWeight="bold" color={formData.isActive ? "#16a34a" : "#64748b"}>{formData.isActive ? "Kích hoạt ngay" : "Lưu bản nháp"}</Typography>} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ fontWeight: "600", textTransform: "none", color: "#64748b" }}>Huỷ bỏ</Button>
          <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2, bgcolor: "#ff9f1a", fontWeight: "bold", px: 3, textTransform: "none", "&:hover": { bgcolor: "#e68a00" }, boxShadow: "0 4px 12px rgba(255,159,26,.3)" }}>
            {modalMode === "add" ? "Tạo mã giảm giá" : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default CouponManagementPage;
