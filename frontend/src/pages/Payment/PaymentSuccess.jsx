import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, Container, Card, Stack } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { getPaymentStatus } from "../../services/orderService";
import { formatMoney } from "../../utils/formatters";

const PaymentSuccess = () => {
    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState(null);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const orderCode = queryParams.get("orderCode");

    useEffect(() => {
        const fetchStatus = async () => {
            if (!orderCode) {
                setLoading(false);
                return;
            }
            try {
                const data = await getPaymentStatus(orderCode);
                setPaymentData(data);
            } catch (error) {
                console.error("Error fetching payment status:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, [orderCode]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress sx={{ color: "#4caf50" }} />
            </Box>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, boxShadow: "0 8px 24px rgba(0,0,0,0.05)" }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 80, color: "#4caf50", mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "#2e7d32" }}>
                    Thanh toán thành công!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Cảm ơn bạn đã mua sắm tại cửa hàng. Đơn hàng của bạn đã được ghi nhận.
                </Typography>

                {paymentData && (
                    <Box sx={{ bgcolor: "#f5f5f5", p: 3, borderRadius: 2, mb: 4, textAlign: "left" }}>
                        <Stack spacing={1.5}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="body2" color="text.secondary">Mã đơn hàng</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{paymentData.orderCode}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="body2" color="text.secondary">Tổng tiền</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#f28900" }}>{formatMoney(paymentData.amount)}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="body2" color="text.secondary">Phương thức</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{paymentData.paymentMethod}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="body2" color="text.secondary">Thời gian GD</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {paymentData.paidAt ? new Date(paymentData.paidAt).toLocaleString("vi-VN") : "N/A"}
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="body2" color="text.secondary">Mã GD VNPay</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{paymentData.gatewayTransactionId || "N/A"}</Typography>
                            </Box>
                        </Stack>
                    </Box>
                )}

                <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
                    <Button
                        variant="outlined"
                        component={Link}
                        to="/"
                        sx={{ px: 4, py: 1.5, borderColor: "#ccc", color: "#333", "&:hover": { borderColor: "#999", bgcolor: "#f5f5f5" } }}
                    >
                        Về trang chủ
                    </Button>
                    <Button
                        variant="contained"
                        component={Link}
                        to="/user/orders"
                        sx={{ px: 4, py: 1.5, bgcolor: "#f28900", "&:hover": { bgcolor: "#e67c00" } }}
                    >
                        Lịch sử đơn hàng
                    </Button>
                </Stack>
            </Card>
        </Container>
    );
};

export default PaymentSuccess;
