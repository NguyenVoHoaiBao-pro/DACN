import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
  Divider,
} from "@mui/material";
import {
  ConfirmationNumber as CouponIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  LocalOffer as TagIcon,
  CheckCircle as CheckCircleIcon
} from "@mui/icons-material";
import { getAvailableCoupons } from "../../services/couponService";
import { formatMoney } from "../../utils/formatters";

const CouponSelector = ({ onSelect, selectedCode }) => {
  const [open, setOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await getAvailableCoupons();
      setCoupons(data || []);
    } catch (error) {
      console.error("Lỗi khi tải mã giảm giá:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCoupons();
    }
  }, [open]);

  const handleSelect = (code) => {
    onSelect(code);
    setOpen(false);
  };

  return (
    <>
      <Button
        startIcon={<TagIcon />}
        onClick={() => setOpen(true)}
        sx={{
          textTransform: "none",
          color: "#f28900",
          fontWeight: 600,
          "&:hover": { bgcolor: "#fff8ef" }
        }}
      >
        Chọn mã giảm giá
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">Chọn ưu đãi cho bạn</Typography>
          <IconButton onClick={() => setOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc", p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={30} sx={{ color: "#f28900" }} />
            </Box>
          ) : coupons.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="text.secondary">Hiện không có mã giảm giá nào khả dụng.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {coupons.map((coupon) => (
                <Card 
                  key={coupon.id} 
                  sx={{ 
                    borderRadius: 2, 
                    border: selectedCode === coupon.code ? "2px solid #f28900" : "1px solid #e2e8f0",
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  {selectedCode === coupon.code && (
                    <Box sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'white', borderRadius: '50%', zIndex: 1 }}>
                      <CheckCircleIcon sx={{ color: "#f28900" }} />
                    </Box>
                  )}
                  <CardActionArea onClick={() => handleSelect(coupon.code)}>
                    <CardContent sx={{ display: 'flex', p: 0 }}>
                      {/* Left part - Icon/Value */}
                      <Box sx={{ 
                        width: 100, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: '#fff8ef',
                        borderRight: '1px dashed #ffe0b2',
                        p: 1
                      }}>
                        <CouponIcon sx={{ color: '#f28900', fontSize: 32, mb: 0.5 }} />
                        <Typography variant="caption" fontWeight="bold" textAlign="center" sx={{ color: '#f28900' }}>
                          {coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : 'GIẢM GIÁ'}
                        </Typography>
                      </Box>
                      
                      {/* Right part - Details */}
                      <Box sx={{ flex: 1, p: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">{coupon.code}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {coupon.name || coupon.description || "Ưu đãi hấp dẫn cho đơn hàng của bạn"}
                        </Typography>
                        
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TimerIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                          <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 500 }}>
                            HSD: {coupon.dateEnd}
                          </Typography>
                        </Stack>
                        
                        {coupon.minOrderValue > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            * Đơn tối thiểu {formatMoney(coupon.minOrderValue)}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button fullWidth variant="contained" onClick={() => setOpen(false)} sx={{ bgcolor: "#f28900", "&:hover": { bgcolor: "#e67c00" }, textTransform: 'none', fontWeight: 'bold' }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CouponSelector;
