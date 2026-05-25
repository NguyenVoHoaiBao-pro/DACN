import { Box, Card, CardContent, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, TablePagination } from "@mui/material";
import { useState } from "react";

const ConversionRateTable = ({ data = [], loading }) => {
    if (loading) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <CircularProgress color="primary" />
                    <Typography color="text.secondary">Đang tải biểu đồ...</Typography>
                </CardContent>
            </Card>
        );
    }

    // Backend payload has: "productRates" array.
    const productRates = data?.productRates || data || [];

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedRates = productRates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Card
            sx={{
                borderRadius: 6,
                boxShadow: "0 10px 50px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                height: "100%"
            }}
        >
            <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                <Typography variant="h5" fontWeight={900} color="#1e293b" sx={{ mb: 1, letterSpacing: -0.5 }}>
                    Tỉ lệ Chuyển đổi
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 4, opacity: 0.6 }}>
                    Theo dõi phễu tương tác (Lượt xem &rarr; Lượt mua)
                </Typography>

                <TableContainer sx={{ flexGrow: 1, minHeight: 420, overflowY: "auto", "&::-webkit-scrollbar": { width: "6px" }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(0,0,0,0.1)", borderRadius: "10px" } }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 800, bgcolor: "rgba(0,0,0,0.02)", color: "#1e293b" } }}>
                                <TableCell>Sản phẩm</TableCell>
                                <TableCell align="right">Lượt xem</TableCell>
                                <TableCell align="right">Lượt mua</TableCell>
                                <TableCell align="left" sx={{ width: "30%" }}>Tỉ lệ CV Rate</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {productRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                            Chưa có dữ liệu theo dõi hành vi trong kỳ này.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRates.map((row, index) => (
                                    <TableRow key={index} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                        <TableCell sx={{ fontWeight: 600, color: "#334155", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {row.productName}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: "#1e293b" }}>{row.viewCount}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: "#10b981" }}>{row.purchaseCount}</TableCell>
                                        <TableCell align="left">
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                <Box sx={{ width: "100%" }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(row.conversionRate, 100)}
                                                        sx={{
                                                            height: 8,
                                                            borderRadius: 5,
                                                            bgcolor: "rgba(0,0,0,0.05)",
                                                            "& .MuiLinearProgress-bar": {
                                                                borderRadius: 5,
                                                                background: `linear-gradient(90deg, #3b82f6 ${Math.max(0, row.conversionRate - 10)}%, #10b981 100%)`
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                                <Typography variant="body2" fontWeight={900} color="#1e293b" sx={{ minWidth: 40 }}>
                                                    {row.conversionRate?.toFixed(1)}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {productRates.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        sx={{ mt: "auto", borderTop: "1px solid rgba(0,0,0,0.05)" }}
                        count={productRates.length}
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

export default ConversionRateTable;
