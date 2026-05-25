import { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Rating, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip,
  Typography, CircularProgress,
} from "@mui/material";
import {
  CheckCircle as ApproveIcon, VisibilityOff as HideIcon, Reply as ReplyIcon,
  Delete as DeleteIcon, Star as StarIcon, Verified as VerifiedIcon,
  Message as MessageIcon, Refresh as RefreshIcon, ThumbUp as ThumbUpIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  adminGetAllReviews, adminUpdateReviewStatus, adminReplyReview, adminDeleteReview,
} from "../../services/reviewService";

const ReviewManagementPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reply Dialog
  const [replyDialog, setReplyDialog] = useState({ open: false, review: null });
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: rowsPerPage,
        sort: "createdAt,desc",
      };
      const res = await adminGetAllReviews(params);
      if (res.success) {
        setReviews(res.data.content);
        setTotalElements(res.data.totalElements);
      }
    } catch (err) {
      toast.error("Không thể tải danh sách đánh giá");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleStatusToggle = async (review) => {
    try {
      const newStatus = !review.isApproved;
      const res = await adminUpdateReviewStatus(review.id, { isApproved: newStatus });
      if (res.success) {
        toast.success(newStatus ? "Đã duyệt đánh giá" : "Đã ẩn đánh giá");
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, isApproved: newStatus } : r))
        );
      }
    } catch (err) {
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const handleOpenReply = (review) => {
    setReplyDialog({ open: true, review });
    setReplyText(review.replyContent || "");
  };

  const handleCloseReply = () => {
    setReplyDialog({ open: false, review: null });
    setReplyText("");
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      toast.warning("Vui lòng nhập nội dung phản hồi");
      return;
    }
    setSubmittingReply(true);
    try {
      const res = await adminReplyReview(replyDialog.review.id, { replyContent: replyText });
      if (res.success) {
        toast.success("Đã gửi phản hồi thành công!");
        setReviews((prev) =>
          prev.map((r) =>
            r.id === replyDialog.review.id ? { ...r, replyContent: replyText, repliedAt: new Date() } : r
          )
        );
        handleCloseReply();
      }
    } catch (err) {
      toast.error("Không thể gửi phản hồi");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await adminDeleteReview(deleteDialog.id);
      if (res.success) {
        toast.success("Xóa đánh giá thành công");
        fetchReviews();
      }
    } catch (err) {
      toast.error("Xóa thất bại");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const approvedCount = reviews.filter(r => r.isApproved).length;
  const hiddenCount = reviews.filter(r => !r.isApproved).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <AdminLayout currentPage="Đánh giá">
      <Box sx={{ p: 3 }}>
        {/* HEADER */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>⭐ Quản Lý Đánh Giá</Typography>
            <Typography variant="body1" color="text.secondary">Xem, kiểm duyệt và phản hồi ý kiến của khách hàng về sản phẩm</Typography>
          </Box>
          <Button startIcon={<RefreshIcon />} onClick={fetchReviews} variant="contained"
            sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, borderRadius: "10px", fontWeight: "bold", textTransform: "none", boxShadow: "0 4px 12px rgba(255,159,26,0.3)" }}>
            Làm mới
          </Button>
        </Box>

        {/* STAT CARDS */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, mb: 3 }}>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", boxShadow: "0 8px 32px rgba(102,126,234,.3)", transition: "transform .2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="overline" sx={{ opacity: .85, letterSpacing: 1 }}>Tổng đánh giá</Typography><Typography variant="h3" fontWeight="bold">{totalElements}</Typography></Box><MessageIcon sx={{ fontSize: 56, opacity: .3 }} /></Box></CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg,#11998e,#38ef7d)", color: "white", boxShadow: "0 8px 32px rgba(17,153,142,.3)", transition: "transform .2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="overline" sx={{ opacity: .85, letterSpacing: 1 }}>Đã duyệt</Typography><Typography variant="h3" fontWeight="bold">{approvedCount}</Typography></Box><ApproveIcon sx={{ fontSize: 56, opacity: .3 }} /></Box></CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg,#f093fb,#f5576c)", color: "white", boxShadow: "0 8px 32px rgba(245,87,108,.3)", transition: "transform .2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="overline" sx={{ opacity: .85, letterSpacing: 1 }}>Đã ẩn</Typography><Typography variant="h3" fontWeight="bold">{hiddenCount}</Typography></Box><HideIcon sx={{ fontSize: 56, opacity: .3 }} /></Box></CardContent>
          </Card>
          <Card sx={{ borderRadius: "16px", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white", boxShadow: "0 8px 32px rgba(245,158,11,.3)", transition: "transform .2s", "&:hover": { transform: "translateY(-4px)" } }}>
            <CardContent sx={{ p: 3 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="overline" sx={{ opacity: .85, letterSpacing: 1 }}>Đánh giá TB</Typography><Typography variant="h3" fontWeight="bold">{avgRating} ⭐</Typography></Box><ThumbUpIcon sx={{ fontSize: 56, opacity: .3 }} /></Box></CardContent>
          </Card>
        </Box>

        <Card sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,.06)", overflow: "hidden" }}>
          <TableContainer sx={{ position: "relative", minHeight: 400 }}>
            {loading && (
              <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)", zIndex: 10 }}>
                <CircularProgress color="warning" />
              </Box>
            )}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Khách hàng / Ngày</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Sản phẩm</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Đánh giá</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Nội dung</TableCell>
                  <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: "bold", color: "#64748b", py: 2, px: 3 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <MessageIcon sx={{ fontSize: 48, color: "#cbd5e0", mb: 1 }} />
                      <Typography color="text.secondary">Chưa có đánh giá nào</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((row, idx) => (
                    <TableRow key={row.id} hover sx={{ bgcolor: idx % 2 === 0 ? "white" : "#fafbfc", "&:hover": { bgcolor: "#f5f3ff" }, transition: "background .15s" }}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {row.user?.name || row.user?.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(row.createdAt).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                        {row.isVerifiedPurchase && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              icon={<VerifiedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Đã xác thực"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "10px" }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {row.productName || `Product ID: ${row.productId || 'N/A'}`}
                        </Typography>
                        {row.variantName && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            Phân loại: {row.variantName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight="bold">{row.rating}</Typography>
                          <StarIcon sx={{ color: "#fbbf24", fontSize: 18 }} />
                        </Box>
                        <Rating value={row.rating} readOnly size="small" precision={0.5} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="subtitle2" fontWeight="700" noWrap>{row.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {row.content}
                        </Typography>
                        {row.replyContent && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: "#f0f9ff", borderRadius: 1, borderLeft: "3px solid #0ea5e9" }}>
                            <Typography variant="caption" fontWeight="bold" color="primary">Shop đã phản hồi:</Typography>
                            <Typography variant="caption" display="block">{row.replyContent}</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.isApproved ? "Hiển thị" : "Đã ẩn"}
                          size="small"
                          sx={{ fontWeight: "700", bgcolor: row.isApproved ? "#f0fdf4" : "#f8fafc", color: row.isApproved ? "#16a34a" : "#64748b", border: `1px solid ${row.isApproved ? "#bbf7d0" : "#e2e8f0"}` }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title={row.isApproved ? "Ẩn đánh giá" : "Duyệt đánh giá"}>
                            <IconButton 
                              size="small" 
                              color={row.isApproved ? "warning" : "success"}
                              onClick={() => handleStatusToggle(row)}
                            >
                              {row.isApproved ? <HideIcon fontSize="small" /> : <ApproveIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Phản hồi">
                            <IconButton size="small" color="primary" onClick={() => handleOpenReply(row)}>
                              <ReplyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa vĩnh viễn">
                            <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: row.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
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
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Card>

        {/* Reply Dialog */}
        <Dialog open={replyDialog.open} onClose={handleCloseReply} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: "bold" }}>Phản hồi đánh giá</DialogTitle>
          <DialogContent>
            {replyDialog.review && (
              <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {replyDialog.review.user?.name} đánh giá {replyDialog.review.rating} ⭐
                </Typography>
                <Typography variant="body2" color="text.secondary">"{replyDialog.review.content}"</Typography>
              </Box>
            )}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Nội dung phản hồi"
              placeholder="Cảm ơn bạn đã tin tưởng dịch vụ..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={handleCloseReply} sx={{ fontWeight: "600", textTransform: "none", color: "#64748b" }}>Hủy bỏ</Button>
            <Button variant="contained" onClick={handleSubmitReply} disabled={submittingReply}
              startIcon={submittingReply ? <CircularProgress size={20} color="inherit" /> : <ReplyIcon />}
              sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, borderRadius: 2, fontWeight: "bold", textTransform: "none", boxShadow: "0 4px 12px rgba(255,159,26,.3)" }}>
              {replyDialog.review?.replyContent ? "Cập nhật phản hồi" : "Gửi phản hồi"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
          <DialogTitle sx={{ fontWeight: "bold" }}>Xác nhận xóa?</DialogTitle>
          <DialogContent>
            <Typography>Hành động này sẽ xóa vĩnh viễn đánh giá và không thể hoàn tác.</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Hủy</Button>
            <Button variant="contained" color="error" onClick={handleDelete}>Xóa vĩnh viễn</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default ReviewManagementPage;
