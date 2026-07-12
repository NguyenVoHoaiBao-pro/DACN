import { useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, FormControlLabel, Radio, RadioGroup,
  Snackbar, TextField, Typography, CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  AssignmentReturn as ReturnIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { processStockReturn } from "../../services/inventoryService";
import { adminGetOrders } from "../../services/orderService";

const StockReturnPage = () => {
  const [imei, setImei] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [isDefective, setIsDefective] = useState("false");
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  const handleOrderSearch = async () => {
    if (!orderSearch.trim()) return;
    setOrderLoading(true);
    setOrderResult(null);
    try {
      const page = await adminGetOrders(0, 5, null, orderSearch.trim());
      const match = page?.content?.[0];
      if (match) {
        setOrderResult(match);
      } else {
        showToast("Không tìm thấy đơn hàng.", "warning");
      }
    } catch {
      showToast("Tra cứu đơn thất bại.", "error");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imei.trim()) {
      showToast("Vui lòng nhập hoặc quét mã Serial Number", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        imei: imei.trim(),
        reason: reason.trim(),
        isDefective: isDefective === "true"
      };
      
      const res = await processStockReturn(payload);
      if (res.success) {
        showToast("Đã ghi nhận kho cho hàng trả lại thành công! 🎉", "success");
        setImei("");
        setReason("");
        setIsDefective("false");
      } else {
        showToast(res.message || "Lỗi khi xử lý hàng trả lại", "error");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        showToast("CẢNH BÁO: Mã Serial này không do hệ thống cung cấp. Vui lòng kiểm tra lại hoá đơn.", "error");
      } else if (err.response?.status === 403) {
        showToast("Bạn không có quyền xử lý đổi/trả hàng. Liên hệ Admin!", "error");
      } else {
        showToast(err.response?.data?.message || "Lỗi kết nối server.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout currentPage="Trả hàng">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <ReturnIcon sx={{ fontSize: 32, color: "#1976d2" }} />
            <Typography variant="h4" fontWeight="bold">
              Tiếp Nhận Hàng Trả Lại / Bảo Hành
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Xử lý hàng do khách trả lại, cập nhật lại tồn kho hoặc cách ly máy lỗi.
          </Typography>
        </Box>

        <Card sx={{ maxWidth: 800, borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Tra cứu theo mã đơn / vận đơn
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField size="small" fullWidth placeholder="ORD-... hoặc mã vận đơn"
                value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
              <Button variant="outlined" onClick={handleOrderSearch} disabled={orderLoading}>
                {orderLoading ? <CircularProgress size={20} /> : "Tìm"}
              </Button>
            </Box>
            {orderResult && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Đơn <strong>{orderResult.orderCode}</strong> · {orderResult.shippingName} ·{" "}
                <Chip size="small" label={orderResult.status} />
                {orderResult.trackingCode && <> · VĐ: {orderResult.trackingCode}</>}
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: 800, borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Quét mã Serial Number
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="VD: SN-F2LDN3K4N741"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              sx={{ mb: 4, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
            />

            <Divider sx={{ mb: 4 }} />

            {/* Condition Selection */}
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Tình trạng sản phẩm
            </Typography>
            <RadioGroup
              value={isDefective}
              onChange={(e) => setIsDefective(e.target.value)}
              sx={{ mb: 4, gap: 2 }}
            >
              <Box
                sx={{
                  border: `2px solid ${isDefective === "false" ? "#4caf50" : "#eee"}`,
                  borderRadius: 2,
                  p: 2,
                  bgcolor: isDefective === "false" ? "#f1f8e9" : "#fff",
                  transition: "all 0.2s ease"
                }}
              >
                <FormControlLabel
                  value="false"
                  control={<Radio color="success" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CheckIcon color="success" />
                      <Box>
                        <Typography fontWeight="bold">Còn nguyên vẹn (Hoàn lại kho)</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Máy hoạt động bình thường, sẽ được cộng lại 1 vào số lượng tồn kho để bán tiếp.
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, width: "100%" }}
                />
              </Box>

              <Box
                sx={{
                  border: `2px solid ${isDefective === "true" ? "#ef5350" : "#eee"}`,
                  borderRadius: 2,
                  p: 2,
                  bgcolor: isDefective === "true" ? "#ffebee" : "#fff",
                  transition: "all 0.2s ease"
                }}
              >
                <FormControlLabel
                  value="true"
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ErrorIcon color="error" />
                      <Box>
                        <Typography fontWeight="bold">Lỗi kỹ thuật / Hư hỏng (Cách ly)</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Máy bị lỗi từ nhà sản xuất hoặc hư hỏng, KHÔNG cộng vào tồn kho bán hàng.
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, width: "100%" }}
                />
              </Box>
            </RadioGroup>

            {/* Reason Input */}
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Lý do / Mô tả lỗi
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="Nhập chi tiết lý do khách đổi trả hoặc mô tả tình trạng lỗi của máy..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={{ mb: 4, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || !imei.trim()}
              onClick={handleSubmit}
              sx={{
                borderRadius: 2,
                py: 1.5,
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#115293" },
                fontSize: "1.1rem",
                textTransform: "none",
                fontWeight: "bold"
              }}
            >
              {loading ? <CircularProgress size={26} color="inherit" /> : "Xác nhận thu hồi máy"}
            </Button>
          </CardContent>
        </Card>

        {/* Toast */}
        <Snackbar
            open={toast.open}
            autoHideDuration={4000}
            onClose={() => setToast({ ...toast, open: false })}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
            <Alert
                severity={toast.severity}
                onClose={() => setToast({ ...toast, open: false })}
                sx={{ width: "100%", borderRadius: 2, fontWeight: 600 }}
                variant="filled"
            >
                {toast.message}
            </Alert>
        </Snackbar>
      </Box>
    </AdminLayout>
  );
};

export default StockReturnPage;
