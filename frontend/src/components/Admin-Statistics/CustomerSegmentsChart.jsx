import { Box, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const CustomerSegmentsChart = ({ data = [], loading }) => {
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

    const segments = data?.segments || data || [];

    if (!loading && segments.length === 0) {
        return (
            <Card sx={{ borderRadius: 6, boxShadow: "0 10px 50px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.2)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
                <CardContent>
                    <Typography color="text.secondary">Chưa có dữ liệu phân khúc khách hàng.</Typography>
                </CardContent>
            </Card>
        );
    }

    // Calculate total users or interactions
    const totalInteractions = segments.length > 0
        ? segments.reduce((sum, item) => sum + (item.userCount || 0), 0)
        : 0;

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
                    Phân khúc Khách hàng
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 4, opacity: 0.6 }}>
                    Phân tích sở thích dựa trên hành vi
                </Typography>

                <Box sx={{ position: "relative", width: "100%", height: 320 }}>
                    {/* Central text for donut chart */}
                    <Box sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                    }}>
                        <Typography variant="h4" fontWeight={950} sx={{ color: "#1e293b", lineHeight: 1 }}>
                            {totalInteractions || 0}
                        </Typography>
                        <Typography variant="caption" fontWeight={900} sx={{ color: "text.secondary", opacity: 0.6, textTransform: "uppercase", fontSize: "0.55rem" }}>
                            LƯỢT TƯƠNG TÁC
                        </Typography>
                    </Box>

                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={segments}
                                cx="50%"
                                cy="50%"
                                innerRadius={85}
                                outerRadius={110}
                                paddingAngle={4}
                                dataKey="userCount"
                                nameKey="segmentLabel"
                                strokeWidth={0}
                                animationDuration={1500}
                            >
                                {segments.map((entry, index) => {
                                    const vibrantColor = ["#FF3366", "#00C9A7", "#845EC2", "#FF9671", "#FFC75F", "#0081CF"][index % 6];
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={vibrantColor}
                                            style={{ filter: `drop-shadow(0 4px 12px ${vibrantColor}60)`, cursor: 'pointer' }}
                                        />
                                    );
                                })}
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
                                formatter={(value, name, props) => [
                                    `${value} (${props.payload.percentage?.toFixed(1)}%)`,
                                    props.payload.segmentLabel || name
                                ]}
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
                    gap: 1.5,
                }}>
                    {segments.map((entry, index) => {
                        const vibrantColor = ["#FF3366", "#00C9A7", "#845EC2", "#FF9671", "#FFC75F", "#0081CF"][index % 6];
                        return (
                        <Box
                            key={index}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1,
                                borderRadius: 2,
                                transition: "background-color 0.2s",
                                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" }
                            }}
                        >
                            <Box sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "4px",
                                backgroundColor: vibrantColor,
                            }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.8 }}>
                                    {entry.categoryName || "Chưa phân loại"}
                                </Typography>
                                <Typography variant="body2" fontWeight={900} color="#1e293b">
                                    {entry.segmentLabel} <Typography component="span" variant="caption" sx={{ opacity: 0.6 }}>({entry.percentage?.toFixed(1)}%)</Typography>
                                </Typography>
                            </Box>
                        </Box>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
};

export default CustomerSegmentsChart;
