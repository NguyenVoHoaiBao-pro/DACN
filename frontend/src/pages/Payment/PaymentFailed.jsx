import { Link, useLocation } from "react-router-dom";
import { Box, Typography, Button, Container, Card, Stack } from "@mui/material";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const PaymentFailed = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const orderCode = queryParams.get("orderCode");
    const message = queryParams.get("message") || "Thanh toán bị hủy hoặc có lỗi xảy ra.";

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card sx={{ p: 4, textAlign: "center", borderRadius: 3, boxShadow: "0 8px 24px rgba(0,0,0,0.05)" }}>
                <CancelOutlinedIcon sx={{ fontSize: 80, color: "#d32f2f", mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "#d32f2f" }}>
                    Thanh toán thất bại
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    {message}
                </Typography>

                {orderCode && (
                    <Box sx={{ bgcolor: "#fdf0f0", p: 2, borderRadius: 2, mb: 4 }}>
                        <Typography variant="body2" color="text.secondary">Mã đơn hàng: <b style={{ color: "#333" }}>{orderCode}</b></Typography>
                    </Box>
                )}

                <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
                    <Button
                        variant="outlined"
                        component={Link}
                        to="/user/orders"
                        sx={{ px: 4, py: 1.5, borderColor: "#ccc", color: "#333", "&:hover": { borderColor: "#999", bgcolor: "#f5f5f5" } }}
                    >
                        Quay lại đơn hàng
                    </Button>
                </Stack>
            </Card>
        </Container>
    );
};

export default PaymentFailed;
