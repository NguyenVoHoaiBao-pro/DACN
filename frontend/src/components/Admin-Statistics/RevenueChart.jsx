import { Box, Card, CardContent, Divider, Skeleton, Typography } from "@mui/material";
import { Assessment } from "@mui/icons-material";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

const RevenueChart = ({ data, loading }) => {
    if (loading) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <CardContent sx={{ p: 4 }}>
                    <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 4 }} />
                </CardContent>
            </Card>
        );
    }

    const formatCurrency = (value) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(20px)",
                    p: 2,
                    borderRadius: 3,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                    border: "1px solid rgba(255,255,255,0.3)"
                }}>
                    <Typography variant="body2" fontWeight={900} sx={{ mb: 1, color: "#1e293b", letterSpacing: 0.5 }}>
                        {label}
                    </Typography>
                    <Divider sx={{ mb: 1.5, opacity: 0.5 }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Doanh thu</Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={900} color="#3b82f6">{formatCurrency(payload[0].value)}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#ec4899" }} />
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Đơn hàng</Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={900} color="#ec4899">{payload[1]?.value || 0} đơn</Typography>
                        </Box>
                    </Box>
                </Box>
            );
        }
        return null;
    };

    if (!loading && (!data?.dataPoints || data.dataPoints.length === 0)) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)", height: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <Assessment sx={{ fontSize: 80, color: "text.disabled", opacity: 0.5 }} />
                <Typography color="text.secondary" fontWeight={600}>Không có dữ liệu trong khoảng thời gian này</Typography>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                position: "relative",
                borderRadius: 6,
                boxShadow: "0 10px 50px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(10px)",
                height: "100%",
                overflow: "visible",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", flexGrow: 1, pb: "24px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={900} color="#1e293b">
                            Biểu đồ Doanh thu
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Phân tích xu hướng kinh doanh
                        </Typography>
                    </Box>
                    <Box sx={{ bgcolor: "#3b82f610", px: 2, py: 1, borderRadius: 2.5, border: "1px solid #3b82f620" }}>
                        <Typography variant="h5" fontWeight={950} color="#3b82f6">
                            {formatCurrency(data?.totalRevenue || 0)}
                        </Typography>
                        <Typography variant="caption" color="primary" fontWeight={800} sx={{ letterSpacing: 0.5, fontSize: "0.6rem" }}>
                            TỔNG DOANH THU KỲ NÀY
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ width: "100%", flexGrow: 1, minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data?.dataPoints || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                                tickFormatter={(val) => val > 999999 ? (val / 1000000).toFixed(1) + 'M' : val > 999 ? (val / 1000).toFixed(0) + 'k' : val}
                            />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f620', strokeWidth: 10 }} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "white" }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                animationDuration={1500}
                                fill="url(#colorRevenue)"
                            />
                            <Line
                                type="monotone"
                                dataKey="orders"
                                stroke="#ec4899"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#ec4899", strokeWidth: 2, stroke: "white" }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                animationDuration={1500}
                                fill="url(#colorOrders)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </CardContent>
        </Card>
    );
};

export default RevenueChart;
