/**
 * Màn hình 1 — Warranty Dashboard (Sales)
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon, Build as ProcessIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { getWarrantyClaims } from "../../services/warrantyService";
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS } from "../../utils/warrantyClaimStatus";
import { isApiSuccess } from "../../utils/apiResponse";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "APPROVED", label: "Đã duyệt thu hồi" },
  { value: "RECEIVED", label: "Đã nhận máy" },
  { value: "INSPECTING", label: "Đang kiểm tra" },
  { value: "REPAIRING", label: "Đang sửa" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "REJECTED", label: "Từ chối" },
];

const SalesWarrantyClaimsPage = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWarrantyClaims({
        page,
        size: 15,
        status: statusFilter || undefined,
        keyword: keyword.trim() || undefined,
      });
      if (isApiSuccess(res) && res.data) {
        setClaims(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tải được danh sách ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(0);
    load();
  };

  return (
    <AdminLayout currentPage="Yêu cầu BH online">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Ticket bảo hành online
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Danh sách yêu cầu từ khách — sắp xếp theo thời gian gửi. Bấm <strong>Xử lý</strong> với ticket Chờ xử lý.
        </Typography>

        <Card sx={{ mb: 2, p: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Mã ticket, mã vận đơn, tên khách, IMEI..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              value={statusFilter}
              label="Trạng thái"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              {STATUS_FILTERS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSearch}>
            Tìm
          </Button>
          <Button variant="text" onClick={() => navigate("/admin/warranty")}>
            Phiếu RMA tại quầy
          </Button>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã Ticket</TableCell>
                  <TableCell>Tên khách hàng</TableCell>
                  <TableCell>Tên sản phẩm</TableCell>
                  <TableCell>Vận đơn thu hồi</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày gửi</TableCell>
                  <TableCell align="right">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      Không có ticket
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} color="primary">
                          #{c.claimNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{c.contactName}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography noWrap title={c.productName}>
                          {c.productName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {c.returnTrackingCode ? (
                          <>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {c.returnCarrier || "VC"}
                            </Typography>
                            #{String(c.returnTrackingCode).replace(/^#/, "")}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={CLAIM_STATUS_LABELS[c.status] || c.statusDisplay}
                          sx={{
                            bgcolor: CLAIM_STATUS_COLORS[c.status] || "#94a3b8",
                            color: "#fff",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {c.createdAt ? new Date(c.createdAt).toLocaleString("vi-VN") : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant={c.status === "PENDING" ? "contained" : "outlined"}
                          startIcon={<ProcessIcon />}
                          onClick={() => navigate(`/admin/warranty-claims/${c.id}`)}
                        >
                          {c.status === "PENDING" ? "Xử lý" : "Chi tiết"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(_, p) => setPage(p - 1)}
                color="primary"
              />
            </Box>
          )}
        </Card>
      </Box>
    </AdminLayout>
  );
};

export default SalesWarrantyClaimsPage;
