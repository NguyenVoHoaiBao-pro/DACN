import { Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useNavigate } from "react-router-dom";

const OrderStatusChart = ({ data, loading }) => {
    const navigate = useNavigate();
    if (loading) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <CardContent sx={{ p: 4, height: 480, display: "flex", flexDirection: "column" }}>
                    <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
                    <Skeleton variant="circular" width={240} height={240} sx={{ m: "auto" }} />
                    <Box sx={{ mt: 2 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    const statusBreakdown = data?.statusBreakdown || [];

    const handleDrillDown = (status) => {
        if (status) {
            navigate(`/admin/orders?status=${status}`);
        }
    };

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
                display: "flex",
                flexDirection: "column"
            }}
        >
            <CardContent sx={{ p: 4, position: "relative", flexGrow: 1 }}>
                <Typography variant="h5" fontWeight={900} color="#1e293b" sx={{ mb: 1, letterSpacing: -0.5 }}>
                    Trạng thái Đơn hàng
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 4, opacity: 0.6 }}>
                    Tỉ trọng phân bổ các vận đơn
                </Typography>

                <Box sx={{ position: "relative", width: "100%", height: 320 }}>
                    {/* Central text for donut chart */}
                    <Box sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        zIndex: 0
                    }}>
                        <Typography variant="h3" fontWeight={950} sx={{ color: "#1e293b", lineHeight: 1 }}>
                            {data?.totalOrders || 0}
                        </Typography>
                        <Typography variant="caption" fontWeight={900} sx={{ color: "text.secondary", opacity: 0.6, letterSpacing: 1, textTransform: "uppercase", fontSize: "0.6rem" }}>
                            TỔNG ĐƠN HÀNG
                        </Typography>
                    </Box>

                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={85}
                                outerRadius={115}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="label"
                                strokeWidth={0}
                                animationDuration={1500}
                            >
                                {statusBreakdown.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        style={{ filter: `drop-shadow(0 4px 8px ${entry.color}40)`, cursor: 'pointer' }}
                                        onClick={() => handleDrillDown(entry.status)}
                                    />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{
                                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                                    backdropFilter: "blur(20px)",
                                    borderRadius: "15px",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                                    padding: "10px 15px"
                                }}
                                itemStyle={{ fontWeight: 900, fontSize: "13px", color: "#1e293b" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>

                <Box sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 4,
                    bgcolor: "rgba(0,0,0,0.02)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                    border: "1px solid rgba(0,0,0,0.03)"
                }}>
                    {statusBreakdown.map((entry, index) => (
                        <Box
                            key={index}
                            onClick={() => handleDrillDown(entry.status)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                cursor: "pointer",
                                p: 0.5,
                                borderRadius: 1.5,
                                transition: "background-color 0.2s",
                                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" }
                            }}
                        >
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: entry.color,
                            }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.7 }}>
                                    {entry.label}
                                </Typography>
                                <Typography variant="body2" fontWeight={900} color="#1e293b">
                                    {entry.count} <Typography component="span" variant="caption" sx={{ opacity: 0.5 }}>({entry.percentage?.toFixed(1)}%)</Typography>
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
};

export default OrderStatusChart;
