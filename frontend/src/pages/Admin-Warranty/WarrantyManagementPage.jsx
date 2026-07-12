/**
 * WARRANTY MANAGEMENT PAGE — Admin Dashboard
 */

import React, { useState, useEffect } from "react";
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, InputAdornment, MenuItem, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Pagination, IconButton, Tooltip, Avatar, Stack,
} from "@mui/material";
import {
  Search as SearchIcon,
  Shield as ShieldIcon,
  AddCircleOutline as AddIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  HourglassEmpty as PendingIcon,
  Build as BuildIcon,
  CheckCircle as DoneIcon,
  AssignmentReturn as ReturnedIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import CreateWarrantyTicketModal from "./CreateWarrantyTicketModal";
import WarrantyTicketDetailModal from "./WarrantyTicketDetailModal";
import { getWarrantyTickets } from "../../services/warrantyService";
import { formatDate } from "../../utils/formatters";
import { toast } from "react-toastify";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ kiểm tra" },
  { value: "IN_PROGRESS", label: "Đang sửa chữa" },
  { value: "COMPLETED", label: "Đã sửa xong" },
  { value: "RETURNED", label: "Đã trả khách" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const getStatusChip = (status) => {
  const map = {
    PENDING:     { label: "Chờ kiểm tra",  bgcolor: "#fff8e1", color: "#d97706", border: "#fde68a" },
    IN_PROGRESS: { label: "Đang sửa chữa", bgcolor: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    COMPLETED:   { label: "Đã sửa xong",   bgcolor: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    RETURNED:    { label: "Đã trả khách",   bgcolor: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
    CANCELLED:   { label: "Đã hủy",         bgcolor: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  };
  return map[status] || { label: status || "Không rõ", bgcolor: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
};

const WarrantyManagementPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(handler);
  }, [keyword]);

  useEffect(() => { fetchTickets(); }, [page, statusFilter, debouncedKeyword]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await getWarrantyTickets({ page: page - 1, size: 10, status: statusFilter || undefined, keyword: debouncedKeyword || undefined });
      if (res.success && res.data) {
        setTickets(res.data.content);
        setTotalPages(res.data.totalPages);
      } else {
        toast.error(res.message || "Không thể lấy danh sách phiếu.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi tải phiếu.");
    } finally {
      setLoading(false);
    }
  };

  // Derived stats from current data
  const pendingCount = tickets.filter(t => t.status === "PENDING").length;
  const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const completedCount = tickets.filter(t => t.status === "COMPLETED").length;

  return (
    <AdminLayout currentPage="Bảo hành">
      <Box sx={{ p: 3 }}>

        {/* ═══ PAGE HEADER ═══ */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>🛡️ Quản Lý Bảo Hành</Typography>
            <Typography variant="body1" color="text.secondary">Quản lý phiếu tiếp nhận, sửa chữa và trả bảo hành</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{
              bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" },
              px: 3, py: 1.2, borderRadius: "10px",
              fontWeight: "bold", textTransform: "none", fontSize: "1rem",
              boxShadow: "0 4px 12px rgba(255,159,26,0.3)",
            }}
          >
            Tạo Phiếu Tiếp Nhận
          </Button>
        </Box>

        {/* ═══ STAT CARDS ═══ */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, mb: 3 }}>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", boxShadow: "0 8px 32px rgba(102,126,234,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Tổng phiếu</Typography>
                  <Typography variant="h3" fontWeight="bold">{loading ? <CircularProgress size={36} color="inherit" /> : tickets.length}</Typography>
                </Box>
                <ShieldIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white", boxShadow: "0 8px 32px rgba(245,158,11,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Chờ kiểm tra</Typography>
                  <Typography variant="h3" fontWeight="bold">{pendingCount}</Typography>
                </Box>
                <PendingIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", boxShadow: "0 8px 32px rgba(59,130,246,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Đang sửa chữa</Typography>
                  <Typography variant="h3" fontWeight="bold">{inProgressCount}</Typography>
                </Box>
                <BuildIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", color: "white", boxShadow: "0 8px 32px rgba(17,153,142,0.3)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>Hoàn thành</Typography>
                  <Typography variant="h3" fontWeight="bold">{completedCount}</Typography>
                </Box>
                <DoneIcon sx={{ fontSize: 56, opacity: 0.3 }} />
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
                placeholder="Tìm kiếm Tên/SĐT/IMEI/Mã Phiếu..."
                variant="outlined" size="small"
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#94a3b8" }} /></InputAdornment>,
                  sx: { borderRadius: 2, bgcolor: "white" },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  displayEmpty
                  sx={{ borderRadius: 2, bgcolor: "white" }}
                  startAdornment={<FilterIcon sx={{ mr: 1, color: "#94a3b8", fontSize: 18 }} />}
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* ═══ DATA TABLE ═══ */}
        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Mã Phiếu</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Khách Hàng</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Sản Phẩm / IMEI</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Ngày Nhận</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Trạng Thái</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Thao Tác</TableCell>
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
                ) : tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}>
                      <ShieldIcon sx={{ fontSize: 64, color: "#cbd5e0", mb: 1 }} />
                      <Typography variant="h6" fontWeight="700" color="text.secondary">Chưa có phiếu bảo hành nào</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Tạo phiếu mới hoặc thay đổi bộ lọc</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket, idx) => {
                    const sc = getStatusChip(ticket.status);
                    return (
                      <TableRow key={ticket.id} hover sx={{
                        bgcolor: idx % 2 === 0 ? "white" : "#fafbfc",
                        "&:hover": { bgcolor: "#f5f3ff" },
                        transition: "background 0.15s"
                      }}>
                        <TableCell sx={{ py: 2, px: 3 }}>
                          <Chip label={ticket.ticketCode} size="small"
                            sx={{ fontWeight: 700, bgcolor: "#f8fafc", color: "#475569", fontFamily: "monospace", fontSize: "0.77rem", border: "1px solid #e2e8f0" }} />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: "#667eea", fontSize: "0.85rem", fontWeight: "bold" }}>
                              {ticket.customerName?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="700" color="#1e293b">{ticket.customerName}</Typography>
                              <Typography variant="caption" color="text.secondary">{ticket.customerPhone}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" fontWeight="600" color="#1e293b">{ticket.productName}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>IMEI: {ticket.imei}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" color="text.secondary">{formatDate(ticket.receivedAt)}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Chip label={sc.label} size="small"
                            sx={{ bgcolor: sc.bgcolor, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: "700", fontSize: "0.72rem" }} />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2, px: 3 }}>
                          <Tooltip title="Xem chi tiết & Cập nhật">
                            <IconButton
                              onClick={() => setDetailTicketId(ticket.id)}
                              sx={{ bgcolor: "#eff6ff", color: "#2563eb", "&:hover": { bgcolor: "#bfdbfe" } }}
                              size="small"
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", px: 3, py: 2, borderTop: "1px solid #f1f5f9", gap: 2 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="600">
                Trang {page} / {totalPages}
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, v) => setPage(v)}
                color="warning"
                shape="rounded"
                size="small"
              />
            </Box>
          )}
        </Card>
      </Box>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateWarrantyTicketModal
          open={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={fetchTickets}
        />
      )}
      {detailTicketId && (
        <WarrantyTicketDetailModal
          open={!!detailTicketId}
          ticketId={detailTicketId}
          onClose={() => setDetailTicketId(null)}
          onSuccess={fetchTickets}
        />
      )}
    </AdminLayout>
  );
};

export default WarrantyManagementPage;
