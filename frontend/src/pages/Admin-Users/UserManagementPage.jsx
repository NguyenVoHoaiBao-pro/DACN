import {
  Add as AddIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  VerifiedUser as StaffIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Badge,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { adminGetUsers, adminToggleUserStatus, adminCreateUser, adminUpdateUser } from "../../services/userService";
import { isApiSuccess } from "../../utils/apiResponse";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [searchVal, setSearchVal] = useState("");

  // Modal states
  const [userModal, setUserModal] = useState({ open: false, mode: "add", data: null });
  const [formData, setFormData] = useState({
    username: "", email: "", fullName: "", password: "", roleId: 4,
  });

  useEffect(() => { fetchUsers(); }, [page, size, keyword, sortBy, sortDir]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminGetUsers({ page, size, keyword, sortBy, sortDir });
      if (isApiSuccess(res) && res.data?.content) {
        setUsers(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") { setKeyword(searchVal); setPage(0); }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await adminToggleUserStatus(user.id);
      if (isApiSuccess(res)) { toast.success(res.message); fetchUsers(); }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi thay đổi trạng thái");
    }
  };

  const handleOpenModal = (mode, user = null) => {
    setUserModal({ open: true, mode, data: user });
    if (mode === "edit" && user) {
      setFormData({ username: user.username, email: user.email, fullName: user.fullName || user.name || "", password: "", roleId: user.roles?.[0]?.id || 4 });
    } else {
      setFormData({ username: "", email: "", fullName: "", password: "", roleId: 4 });
    }
  };

  const handleSaveUser = async () => {
    try {
      const res = userModal.mode === "add"
        ? await adminCreateUser(formData)
        : await adminUpdateUser(userModal.data.id, formData);
      if (isApiSuccess(res)) {
        toast.success(res.message);
        setUserModal({ open: false, mode: "add", data: null });
        fetchUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu người dùng");
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Chưa từng";
    return new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Derived stats
  const activeCount = users.filter(u => u.status === 1).length;
  const lockedCount = users.filter(u => u.status !== 1).length;
  const adminCount = users.filter(u => u.roles?.some(r => r.name === "ADMIN")).length;

  const getRoleChip = (roleName) => {
    const map = {
      ADMIN: { label: "Quản trị viên", bgcolor: "#fef2f2", color: "#dc2626" },
      STAFF: { label: "Nhân viên", bgcolor: "#eff6ff", color: "#2563eb" },
      CUSTOMER: { label: "Khách hàng", bgcolor: "#f0fdf4", color: "#16a34a" },
    };
    return map[roleName] || { label: roleName, bgcolor: "#f1f5f9", color: "#64748b" };
  };

  return (
    <AdminLayout currentPage="Người dùng">
      <Box sx={{ p: 3 }}>

        {/* ═══ PAGE HEADER ═══ */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              👥 Quản Lý Người Dùng
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Tổng số {totalElements} tài khoản đang được quản lý trong hệ thống
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal("add")}
            sx={{
              bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" },
              px: 3, py: 1.2, borderRadius: "10px",
              fontWeight: "bold", textTransform: "none", fontSize: "1rem",
              boxShadow: "0 4px 12px rgba(255,159,26,0.3)",
            }}
          >
            Thêm Người Dùng
          </Button>
        </Box>

        {/* ═══ STAT CARDS ═══ */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, mb: 3 }}>
          {/* Tổng người dùng */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white", boxShadow: "0 8px 32px rgba(102,126,234,0.3)",
            transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Tổng người dùng</Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? <CircularProgress size={36} color="inherit" /> : totalElements}
                  </Typography>
                </Box>
                <GroupIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Đang hoạt động */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
            color: "white", boxShadow: "0 8px 32px rgba(17,153,142,0.3)",
            transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Đang hoạt động</Typography>
                  <Typography variant="h3" fontWeight="bold">{activeCount}</Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Bị khóa */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            color: "white", boxShadow: "0 8px 32px rgba(245,87,108,0.3)",
            transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Bị khóa</Typography>
                  <Typography variant="h3" fontWeight="bold">{lockedCount}</Typography>
                </Box>
                <LockIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Quản trị viên */}
          <Card sx={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white", boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
            transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" },
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Quản trị viên</Typography>
                  <Typography variant="h3" fontWeight="bold">{adminCount}</Typography>
                </Box>
                <AdminIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ═══ TOOLBAR ═══ */}
        <Card sx={{ mb: 3, borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                placeholder="Tìm kiếm theo tên, email, username... (Enter)"
                size="small"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, bgcolor: "white" },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  startAdornment={<SortIcon sx={{ mr: 1, color: "#94a3b8", fontSize: 18 }} />}
                  sx={{ borderRadius: 2, bgcolor: "white" }}
                >
                  <MenuItem value="createdAt">Ngày tạo</MenuItem>
                  <MenuItem value="username">Tên đăng nhập</MenuItem>
                  <MenuItem value="fullName">Họ tên</MenuItem>
                  <MenuItem value="lastLoginAt">Đăng nhập cuối</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value)}
                  sx={{ borderRadius: 2, bgcolor: "white" }}
                >
                  <MenuItem value="desc">Giảm dần</MenuItem>
                  <MenuItem value="asc">Tăng dần</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Làm mới">
                <IconButton onClick={fetchUsers}
                  sx={{ bgcolor: "white", border: "1px solid #e2e8f0", borderRadius: 2, "&:hover": { bgcolor: "#f8fafc" } }}>
                  <HistoryIcon sx={{ fontSize: 20, color: "#64748b" }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </CardContent>
        </Card>

        {/* ═══ USER TABLE ═══ */}
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Người dùng</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Liên hệ</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Vai trò</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Đăng nhập cuối</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}>
                      <CircularProgress color="warning" />
                      <Typography sx={{ mt: 2, color: "#64748b", fontWeight: "600" }}>Đang tải dữ liệu...</Typography>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}>
                      <PersonIcon sx={{ fontSize: 56, color: "#cbd5e0", mb: 1 }} />
                      <Typography color="text.secondary" fontWeight="600">Không tìm thấy người dùng nào</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, idx) => (
                    <TableRow key={user.id} hover sx={{
                      bgcolor: idx % 2 === 0 ? "white" : "#fafbfc",
                      "&:hover": { bgcolor: "#f5f3ff" },
                      transition: "background 0.15s"
                    }}>
                      {/* Avatar + Name */}
                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            variant="dot"
                            color={user.status === 1 ? "success" : "error"}
                          >
                            <Avatar sx={{
                              bgcolor: user.status === 1 ? "#e0f2f1" : "#fce4ec",
                              color: user.status === 1 ? "#00897b" : "#e91e63",
                              fontWeight: "bold", width: 40, height: 40
                            }}>
                              {(user.fullName || user.username)?.charAt(0)?.toUpperCase()}
                            </Avatar>
                          </Badge>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="700" color="#1e293b">
                              {user.fullName || "Chưa cập nhật tên"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight="600">
                              @{user.username}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Contact */}
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight="600" color="#475569">{user.email}</Typography>
                        {user.phone && (
                          <Typography variant="caption" color="text.secondary">{user.phone}</Typography>
                        )}
                      </TableCell>

                      {/* Role */}
                      <TableCell sx={{ py: 2 }}>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {user.roles?.map((role) => {
                            const chip = getRoleChip(role.name);
                            return (
                              <Chip key={role.id || role.name} label={chip.label} size="small"
                                sx={{ bgcolor: chip.bgcolor, color: chip.color, fontWeight: "700", fontSize: "0.7rem" }} />
                            );
                          })}
                        </Stack>
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Chip
                          icon={user.status === 1
                            ? <CheckCircleIcon sx={{ fontSize: 14, color: "#16a34a !important" }} />
                            : <BlockIcon sx={{ fontSize: 14, color: "#dc2626 !important" }} />
                          }
                          label={user.status === 1 ? "Hoạt động" : "Bị khóa"}
                          size="small"
                          onClick={() => handleToggleStatus(user)}
                          sx={{
                            cursor: "pointer",
                            fontWeight: "700",
                            bgcolor: user.status === 1 ? "#f0fdf4" : "#fef2f2",
                            color: user.status === 1 ? "#16a34a" : "#dc2626",
                            border: `1px solid ${user.status === 1 ? "#bbf7d0" : "#fecaca"}`,
                            "&:hover": { opacity: 0.8 },
                          }}
                        />
                      </TableCell>

                      {/* Last login */}
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="500">
                          {formatDateTime(user.lastLoginAt)}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ py: 2, px: 3 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" onClick={() => handleOpenModal("edit", user)} color="warning">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.status === 1 ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleStatus(user)}
                              sx={{
                                bgcolor: user.status === 1 ? "#fef2f2" : "#ecfdf5",
                                color: user.status === 1 ? "#ef4444" : "#10b981",
                                "&:hover": { bgcolor: user.status === 1 ? "#fee2e2" : "#d1fae5" },
                              }}
                            >
                              {user.status === 1 ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination inside card */}
          {totalPages > 1 && (
            <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9" }}>
              <Typography variant="body2" color="text.secondary" fontWeight="600">
                Hiển thị trang {page + 1} / {totalPages} ({totalElements} người dùng)
              </Typography>
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(e, v) => setPage(v - 1)}
                color="warning"
                sx={{ "& .MuiPaginationItem-root": { borderRadius: 2, fontWeight: "bold" } }}
              />
            </Box>
          )}
        </Card>

        {/* ═══ Modal Thêm/Sửa người dùng ═══ */}
        <Dialog
          open={userModal.open}
          onClose={() => setUserModal({ ...userModal, open: false })}
          PaperProps={{ sx: { borderRadius: 4, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)" } }}
          maxWidth="xs" fullWidth
        >
          <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem", pb: 0.5 }}>
            {userModal.mode === "add" ? "➕ Tạo Tài Khoản Mới" : "✏️ Cập Nhật Thông Tin"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1.5 }}>
              <TextField
                fullWidth label="Tên đăng nhập"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={userModal.mode === "edit"}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Email" type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Họ và tên"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              {userModal.mode === "add" && (
                <TextField
                  fullWidth label="Mật khẩu" type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              )}
              <FormControl fullWidth>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.5 }}>VAI TRÒ</Typography>
                <Select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={4}>👤 Khách hàng</MenuItem>
                  <MenuItem value={2}>🛡️ Nhân viên</MenuItem>
                  <MenuItem value={1}>⭐ Quản trị viên</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setUserModal({ ...userModal, open: false })}
              sx={{ fontWeight: "600", textTransform: "none", color: "#64748b" }}
            >
              Huỷ bỏ
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveUser}
              sx={{
                borderRadius: 2, bgcolor: "#ff9f1a", fontWeight: "bold", px: 3,
                textTransform: "none", "&:hover": { bgcolor: "#e68a00" },
                boxShadow: "0 4px 12px rgba(255,159,26,0.3)",
              }}
            >
              {userModal.mode === "add" ? "Tạo tài khoản" : "Lưu thay đổi"}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </AdminLayout>
  );
};

export default UserManagementPage;
