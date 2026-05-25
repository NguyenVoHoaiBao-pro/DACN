import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Button,
    Menu,
    MenuItem,
    CircularProgress,
    Fade,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    IconButton,
    Tooltip as MuiTooltip,
    Snackbar,
    Alert,
    TablePagination,
} from "@mui/material";
import {
    TrendingUp,
    TrendingDown,
    CalendarToday,
    AttachMoney,
    Receipt,
    Group,
    ShoppingCart,
    Visibility,
    Warning,
    ErrorOutline,
    Payments,
    Inventory,
} from "@mui/icons-material";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from "recharts";
import CountUp from "react-countup";
import {
    getOverviewStats,
    getRevenueChart,
    getOrderStatusStats,
    getTopProductStats,
    getRecentOrdersStats,
    getPaymentMethodStats,
    getConversionRates,
    getCustomerSegments,
} from "../../services/statisticsService";
import StatCard from "./StatCard";
import RevenueChart from "./RevenueChart";
import OrderStatusChart from "./OrderStatusChart";
import TopProductsCard from "./TopProductsCard";
import PaymentMethodsBar from "./PaymentMethodsBar";
import ConversionRateTable from "./ConversionRateTable";
import CustomerSegmentsChart from "./CustomerSegmentsChart";

/**
 * Premium Statistics Dashboard Component
 * Integrates all statistics APIs and visualizes data using Recharts and MUI.
 */
const StatisticsDashboard = ({ isAdmin = true, isSales = true }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [overview, setOverview] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [orderStatusData, setOrderStatusData] = useState(null);
    const [bestSellingData, setBestSellingData] = useState(null);
    const [lowStockData, setLowStockData] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [paymentStats, setPaymentStats] = useState(null);
    const [conversionRateData, setConversionRateData] = useState(null);
    const [customerSegmentsData, setCustomerSegmentsData] = useState(null);

    const [period, setPeriod] = useState("month");
    const [anchorEl, setAnchorEl] = useState(null);
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");



    const formatCurrency = (val) =>
        val?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "0 ₫";

    const safeStat = (fn) =>
        fn().catch((err) => {
            console.warn("Dashboard partial API failure:", err?.response?.status, err?.config?.url);
            return null;
        });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const tasks = [
                safeStat(() => getOrderStatusStats()),
                safeStat(() => getTopProductStats("best-selling", 50)),
                safeStat(() => getRecentOrdersStats(50)),
                isAdmin || isSales ? safeStat(() => getOverviewStats()) : Promise.resolve(null),
                isAdmin ? safeStat(() => getRevenueChart(period)) : Promise.resolve(null),
                isAdmin ? safeStat(() => getPaymentMethodStats()) : Promise.resolve(null),
                isAdmin ? safeStat(() => getConversionRates()) : Promise.resolve(null),
                isAdmin ? safeStat(() => getCustomerSegments()) : Promise.resolve(null),
                safeStat(() => getTopProductStats("low-stock", 50)),
            ];

            const results = await Promise.all(tasks);
            const [
                statusRes,
                bestSellingRes,
                recentOrdersRes,
                overviewRes,
                revenueRes,
                paymentRes,
                convRes,
                segRes,
                lowStockRes,
            ] = results;

            setOrderStatusData(statusRes);
            setBestSellingData(bestSellingRes);
            setRecentOrders(recentOrdersRes?.recentOrders || []);
            setOverview(overviewRes);
            setRevenueData(revenueRes);
            setPaymentStats(paymentRes);
            setConversionRateData(convRes);
            setCustomerSegmentsData(segRes);
            setLowStockData(lowStockRes);

            const coreMissing = !statusRes && !overviewRes && !revenueRes;
            if (coreMissing) {
                setError("Không tải được số liệu. Kiểm tra statistics-service (8088), order-service (8086) và MySQL.");
                setToastMessage("Một số API thống kê lỗi — xem Console (F12) để biết endpoint cụ thể.");
                setToastOpen(true);
            }
        } catch (err) {
            console.error("Dashboard data fetch error:", err);
            const status = err.response?.status;
            if (status === 401) {
                window.location.href = "/login";
            } else if (status === 403) {
                setToastMessage("Bạn không có quyền xem báo cáo tài chính");
                setToastOpen(true);
                setError("Không có quyền truy cập");
            } else {
                setError("Hệ thống đang bảo trì số liệu");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, isAdmin, isSales]);

    const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
    const handleCloseMenu = () => setAnchorEl(null);
    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        handleCloseMenu();
    };

    const periodLabel = {
        day: "7 ngày qua",
        month: "30 ngày qua",
        year: "12 tháng qua",
    }[period];

    if (error) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "400px",
                    textAlign: "center",
                    gap: 2,
                }}
            >
                <ErrorOutline sx={{ fontSize: 64, color: "error.main", opacity: 0.5 }} />
                <Typography variant="h5" fontWeight={700} color="text.secondary">
                    {error}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={fetchData}
                    sx={{ borderRadius: 3, textTransform: "none", fontWeight: 700 }}
                >
                    Thử lại
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header with Period Selector */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        📊 Báo cáo Thống kê
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Dữ liệu kinh doanh thời gian thực
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        startIcon={<CalendarToday />}
                        onClick={handleOpenMenu}
                        sx={{
                            bgcolor: "white",
                            color: "#1e293b",
                            borderRadius: 2,
                            px: 3,
                            py: 1.2,
                            fontWeight: 700,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            border: "1px solid rgba(0,0,0,0.08)",
                            textTransform: "none",
                            "&:hover": { bgcolor: "#f8fafc" },
                        }}
                    >
                        {periodLabel}
                    </Button>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleCloseMenu}
                        PaperProps={{
                            sx: { borderRadius: 3, mt: 1, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" },
                        }}
                    >
                        <MenuItem onClick={() => handlePeriodChange("day")}>7 ngày qua</MenuItem>
                        <MenuItem onClick={() => handlePeriodChange("month")}>30 ngày qua</MenuItem>
                        <MenuItem onClick={() => handlePeriodChange("year")}>12 tháng qua</MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* KPI Cards — 4 columns, always side by side */}
            <Box sx={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(4, 1fr)", 
                gap: 3, 
                mb: 3 
            }}>
                <StatCard
                    title="Tổng doanh thu"
                    value={overview?.totalRevenue || 0}
                    growth={overview?.revenueGrowthPercent || 0}
                    unit="VND"
                    icon={AttachMoney}
                    color="#3b82f6"
                    gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                    loading={loading}
                />
                <StatCard
                    title="Tổng đơn hàng"
                    value={overview?.totalOrders || 0}
                    growth={overview?.orderGrowthPercent || 0}
                    icon={Receipt}
                    color="#8b5cf6"
                    gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                    loading={loading}
                />
                <StatCard
                    title="Tổng khách hàng"
                    value={overview?.totalCustomers || 0}
                    growth={overview?.customerGrowthPercent || 0}
                    icon={Group}
                    color="#ec4899"
                    gradient="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                    loading={loading}
                />
                <StatCard
                    title="Đơn đang chờ"
                    value={overview?.pendingOrders || 0}
                    growth={0}
                    icon={ShoppingCart}
                    color="#f59e0b"
                    gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    loading={loading}
                />
            </Box>

            {/* Charts Section — 2 charts side by side */}
            <Box sx={{ display: "flex", gap: 3, mb: 3, alignItems: "stretch" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <RevenueChart data={revenueData} loading={loading} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <OrderStatusChart data={orderStatusData} loading={loading} />
                </Box>
            </Box>

            {/* Insights Section — top products + payment methods */}
            <Box sx={{ display: "flex", gap: 3, mb: 3, alignItems: "stretch" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TopProductsCard data={bestSellingData} loading={loading} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <PaymentMethodsBar data={paymentStats} loading={loading} />
                </Box>
            </Box>

            {/* Customer Behavior Insights Section */}
            {isAdmin && (
                <Box sx={{ display: "flex", flexWrap: { xs: "wrap", md: "nowrap" }, gap: 3, mb: 3, alignItems: "stretch" }}>
                    <Box sx={{ flex: { xs: "1 1 100%", md: "2" }, minWidth: 0 }}>
                        <ConversionRateTable data={conversionRateData} loading={loading} />
                    </Box>
                    <Box sx={{ flex: { xs: "1 1 100%", md: "1" }, minWidth: 0 }}>
                        <CustomerSegmentsChart data={customerSegmentsData} loading={loading} />
                    </Box>
                </Box>
            )}

            {/* Advanced Tables Section — recent orders + low stock */}
            <Box sx={{ display: "flex", gap: 3, alignItems: "stretch" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <RecentOrdersTable orders={recentOrders} loading={loading} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LowStockAlerts data={lowStockData} loading={loading} />
                </Box>
            </Box>

            {/* Error Toast */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={4000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setToastOpen(false)}
                    severity="error"
                    sx={{ width: "100%", borderRadius: 2, fontWeight: 700 }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

// --- Sub-components for better organization ---

const RecentOrdersTable = ({ orders, loading }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedOrders = (orders || []).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const formatCurrency = (val) =>
        val?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "0 ₫";

    const getStatusChip = (status) => {
        const map = {
            DELIVERED: { label: "Đã giao", color: "success" },
            CANCELLED: { label: "Đã hủy", color: "error" },
            PENDING: { label: "Chờ xử lý", color: "warning" },
            SHIPPING: { label: "Đang giao", color: "info" },
            PROCESSING: { label: "Đang xử lý", color: "secondary" },
        };
        const config = map[status] || { label: status, color: "default" };
        return (
            <Chip
                label={config.label}
                color={config.color}
                size="small"
                sx={{ fontWeight: 800, borderRadius: 2 }}
            />
        );
    };

    return (
        <Card
            sx={{
                borderRadius: 5,
                boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(10px)",
                height: "100%", // Đảm bảo chiều cao bằng card bên cạnh
                display: "flex",
                flexDirection: "column"
            }}
        >
            <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                    <Typography variant="h6" fontWeight={900}>
                        Đơn hàng gần đây
                    </Typography>
                    <Button
                        size="small"
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                        startIcon={<Visibility />}
                    >
                        Tất cả
                    </Button>
                </Box>

                <TableContainer sx={{ minHeight: 400, overflowY: "auto", flexGrow: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Mã đơn</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Tổng tiền</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Ngày đặt</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading
                                ? Array.from(new Array(5)).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5} sx={{ py: 2 }} align="center">
                                            <CircularProgress size={20} />
                                        </TableCell>
                                    </TableRow>
                                ))
                                : paginatedOrders.map((order, index) => (
                                    <TableRow key={order.orderId ? `${order.orderId}-${index}` : index} hover>
                                        <TableCell sx={{ fontWeight: 700 }}>#{order.orderCode}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>
                                                {order.customerName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {order.customerEmail}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: "primary.main" }}>
                                            {formatCurrency(order.totalAmount)}
                                        </TableCell>
                                        <TableCell>{getStatusChip(order.status)}</TableCell>
                                        <TableCell variant="caption">
                                            {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {!loading && orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary" fontWeight={600}>
                                            Chưa có dữ liệu cho giai đoạn này
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {orders.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        sx={{ mt: "auto", borderTop: "1px solid rgba(0,0,0,0.05)" }}
                        count={orders.length}
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

const LowStockAlerts = ({ data, loading }) => {
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

    return (
        <Card
            sx={{
                borderRadius: 5,
                boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(10px)",
                height: "100%",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                    <Inventory sx={{ color: "warning.main" }} />
                    <Typography variant="h6" fontWeight={900}>
                        Cảnh báo tồn kho
                    </Typography>
                </Box>

                <Box sx={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 1.5, 
                    minHeight: 400, 
                    flexGrow: 1,
                    overflowY: "auto", 
                    pr: 1,
                    "&::-webkit-scrollbar": { width: "5px" },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(0,0,0,0.1)", borderRadius: "10px" }
                }}>
                    {loading ? (
                        <CircularProgress sx={{ alignSelf: "center", my: 4 }} />
                    ) : products.length > 0 ? (
                        paginatedProducts.map((product, index) => (
                            <Box
                                key={`${product.productId}-${product.variantName}-${index}`}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    p: 1.5,
                                    borderRadius: 3,
                                    bgcolor:
                                        product.status === "CRITICAL"
                                            ? "rgba(239, 68, 68, 0.1)"
                                            : product.status === "OUT_OF_STOCK"
                                                ? "rgba(100, 116, 139, 0.1)"
                                                : "rgba(245, 158, 11, 0.1)",
                                    border: "1px solid rgba(0,0,0,0.03)",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <Avatar
                                        src={product.imageUrl}
                                        variant="rounded"
                                        sx={{ width: 40, height: 40, bgcolor: "white" }}
                                    />
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            fontWeight={800}
                                            sx={{
                                                maxWidth: 150,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {product.productName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {product.variantName}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                    <Typography
                                        variant="body2"
                                        fontWeight={900}
                                        color={
                                            product.status === "CRITICAL"
                                                ? "error.main"
                                                : product.status === "OUT_OF_STOCK"
                                                    ? "text.disabled"
                                                    : "warning.main"
                                        }
                                    >
                                        Tồn: {product.currentStock}
                                    </Typography>
                                    <Chip
                                        label={
                                            product.status === "CRITICAL"
                                                ? "Sắp hết"
                                                : product.status === "OUT_OF_STOCK"
                                                    ? "Hết hàng"
                                                    : "Cảnh báo"
                                        }
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: "0.65rem",
                                            fontWeight: 900,
                                        }}
                                    />
                                </Box>
                            </Box>
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                            Không có sản phẩm nào cần chú ý
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

export default StatisticsDashboard;
