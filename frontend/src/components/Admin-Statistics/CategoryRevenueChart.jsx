import React from "react";
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Typography,
} from "@mui/material";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#14b8a6"];

const formatCurrency = (val) =>
    val?.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }) || "0 ₫";

const CategoryRevenueChart = ({ data, loading }) => {
    const slices = data?.categories || [];
    const chartData = slices.map((s) => ({
        name: s.categoryName,
        value: Number(s.revenue) || 0,
        percentage: s.percentage,
        quantitySold: s.quantitySold,
    }));

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
                flexDirection: "column",
            }}
        >
            <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Typography variant="h6" fontWeight={900} gutterBottom>
                    Doanh thu theo danh mục
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Tổng: {formatCurrency(data?.totalRevenue)}
                </Typography>

                {loading ? (
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
                        <CircularProgress />
                    </Box>
                ) : chartData.length === 0 ? (
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
                        <Typography color="text.secondary" fontWeight={600}>
                            Chưa có dữ liệu trong khoảng thời gian này
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ height: 320, width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={95}
                                    paddingAngle={2}
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, _name, props) => [
                                        `${formatCurrency(value)} (${props.payload.percentage ?? 0}%)`,
                                        props.payload.name,
                                    ]}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(value) => (
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default CategoryRevenueChart;
