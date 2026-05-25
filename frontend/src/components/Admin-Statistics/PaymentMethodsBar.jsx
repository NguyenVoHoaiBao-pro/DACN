import { Box, Card, CardContent, Skeleton, Typography, TablePagination } from "@mui/material";
import { useState } from "react";

const PaymentMethodsBar = ({ data, loading }) => {
    if (loading) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <CardContent sx={{ p: 4 }}>
                    <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
                    {[1, 2, 3].map((i) => (
                        <Box key={i} sx={{ mb: 3 }}>
                            <Skeleton variant="text" width="40%" />
                            <Skeleton variant="rectangular" height={12} sx={{ borderRadius: 2 }} />
                        </Box>
                    ))}
                </CardContent>
            </Card>
        );
    }

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paymentStats = data?.paymentStats || [];
    const paginatedStats = paymentStats.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const formatCurrency = (val) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

    return (
        <Card sx={{
            borderRadius: 6,
            boxShadow: "0 10px 50px rgba(0,0,0,0.06)",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            height: "100%"
        }}>
            <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={900} color="#1e293b" sx={{ mb: 0.5, letterSpacing: -0.5 }}>
                    Phương thức thanh toán
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 4, display: "block", opacity: 0.6 }}>
                    Thống kê theo cổng giao dịch
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minHeight: 400, flexGrow: 1 }}>
                    {paginatedStats.map((stat, index) => (
                        <Box key={index}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={850} color="#1e293b">{stat.label}</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{stat.orderCount} đơn hàng</Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                    <Typography variant="body2" fontWeight={900} color="primary.main">{formatCurrency(stat.totalAmount || 0)}</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ opacity: 0.5 }}>{stat.percentage.toFixed(1)}%</Typography>
                                </Box>
                            </Box>
                            <Box sx={{
                                height: 8,
                                width: "100%",
                                bgcolor: "rgba(0,0,0,0.04)",
                                borderRadius: 4,
                                overflow: "hidden",
                                border: "1px solid rgba(0,0,0,0.01)"
                            }}>
                                <Box sx={{
                                    height: "100%",
                                    width: `${stat.percentage}%`,
                                    bgcolor: stat.color,
                                    borderRadius: 4,
                                    boxShadow: `0 0 10px ${stat.color}40`,
                                    transition: "width 2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                }} />
                            </Box>
                        </Box>
                    ))}
                    {!loading && paymentStats.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                            Chưa có dữ liệu cho giai đoạn này
                        </Typography>
                    )}
                </Box>
                {paymentStats.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        sx={{ mt: "auto", borderTop: "1px solid rgba(0,0,0,0.05)", pt: 1 }}
                        count={paymentStats.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số cổng:"
                        labelDisplayedRows={({ from, to, count }) => `${from} - ${to} trong ${count}`}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default PaymentMethodsBar;
