import { Avatar, Box, Card, CardContent, Skeleton, Typography, TablePagination } from "@mui/material";
import { useState } from "react";

const TopProductsCard = ({ data, loading }) => {
    if (loading) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <CardContent sx={{ p: 4 }}>
                    <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                            <Skeleton variant="circular" width={48} height={48} />
                            <Box sx={{ flex: 1 }}><Skeleton variant="text" width="80%" /><Skeleton variant="text" width="40%" /></Box>
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

    const products = data?.products || [];
    const paginatedProducts = products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
                    Sản phẩm bán chạy
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 3, display: "block", opacity: 0.6 }}>
                    Dựa trên doanh thu kỳ này
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 400, flexGrow: 1 }}>
                    {paginatedProducts.map((product, index) => {
                        const globalIndex = page * rowsPerPage + index;
                        return (
                        <Box key={product.productId} sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.2,
                            borderRadius: 3,
                            transition: "all 0.2s",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.02)", transform: "translateX(5px)" }
                        }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Box sx={{ position: "relative" }}>
                                    <Avatar
                                        src={product.imageUrl}
                                        variant="rounded"
                                        sx={{ width: 44, height: 44, bgcolor: "#f1f5f9", p: 0.5, border: "1px solid rgba(0,0,0,0.05)" }}
                                    />
                                    <Box sx={{
                                        position: "absolute",
                                        top: -6,
                                        left: -6,
                                        width: 20,
                                        height: 20,
                                        bgcolor: globalIndex === 0 ? "#fbbf24" : globalIndex === 1 ? "#94a3b8" : globalIndex === 2 ? "#d97706" : "rgba(255,255,255,0.9)",
                                        color: globalIndex < 3 ? "white" : "text.secondary",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.65rem",
                                        fontWeight: 900,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                        border: "1px solid rgba(0,0,0,0.05)"
                                    }}>
                                        {globalIndex + 1}
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="body2" fontWeight={850} sx={{ color: "#1e293b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                                        {product.productName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: "0.7rem" }}>
                                        Đã bán: {product.quantitySold}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                                <Typography variant="body2" fontWeight={900} color="primary.main">
                                    {formatCurrency(product.revenue || 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ opacity: 0.5, fontSize: "0.6rem", textTransform: "uppercase" }}>
                                    Doanh thu
                                </Typography>
                            </Box>
                        </Box>
                        );
                    })}
                    {!loading && products.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                            Chưa có dữ liệu cho giai đoạn này
                        </Typography>
                    )}
                </Box>
                {products.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        sx={{ mt: "auto", borderTop: "1px solid rgba(0,0,0,0.05)", pt: 1 }}
                        count={products.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số dòng:"
                        labelDisplayedRows={({ from, to, count }) => `${from} - ${to} trong ${count}`}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default TopProductsCard;
