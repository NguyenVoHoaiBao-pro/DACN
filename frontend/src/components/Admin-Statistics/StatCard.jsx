import { Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import { TrendingDown, TrendingUp } from "@mui/icons-material";
import CountUp from "react-countup";

const StatCard = ({ title, value, growth, unit = "", icon: Icon, color, loading, gradient }) => {
    const isPositive = growth > 0;
    const isNegative = growth < 0;

    if (loading) {
        return (
            <Card sx={{ borderRadius: 5, boxShadow: "0 10px 40px rgba(0,0,0,0.04)", border: "1px solid rgba(255,255,255,0.3)" }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                        <Skeleton variant="circular" width={48} height={48} />
                        <Skeleton variant="text" width={60} />
                    </Box>
                    <Skeleton variant="text" width="80%" height={40} />
                    <Skeleton variant="text" width="50%" />
                </CardContent>
            </Card>
        );
    }

    const formatValue = (val) => {
        if (unit === "VND") {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
        }
        if (unit === "$") {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
        }
        return val.toLocaleString();
    };

    return (
        <Card
            sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 5,
                boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                "&:hover": {
                    transform: "translateY(-5px) scale(1.02)",
                    boxShadow: `0 20px 60px ${color}25`,
                    "& .icon-box": {
                        transform: "rotate(10deg) scale(1.1)",
                    },
                    "& .bg-glow": {
                        opacity: 0.6,
                    }
                }
            }}
        >
            {/* Decorative background glow */}
            <Box className="bg-glow" sx={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: gradient || color,
                filter: "blur(60px)",
                opacity: 0.2,
                transition: "opacity 0.4s",
                zIndex: 0
            }} />

            <CardContent sx={{ p: 3, position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box className="icon-box" sx={{
                        p: 1.5,
                        borderRadius: 3.5,
                        background: gradient || color,
                        color: "white",
                        display: "flex",
                        boxShadow: `0 8px 16px ${color}30`,
                        transition: "transform 0.4s"
                    }}>
                        <Icon sx={{ fontSize: 24 }} />
                    </Box>

                    {(growth !== 0 && (isPositive || isNegative)) && (
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: isPositive ? "#059669" : "#dc2626",
                            backgroundColor: isPositive ? "#10b98115" : "#ef444415",
                            px: 1.2,
                            py: 0.6,
                            borderRadius: 2.5,
                            border: `1px solid ${isPositive ? "#10b98120" : "#ef444420"}`
                        }}>
                            {isPositive ? <TrendingUp sx={{ fontSize: 16 }} /> : <TrendingDown sx={{ fontSize: 16 }} />}
                            <Typography variant="caption" fontWeight={900}>
                                {Math.abs(growth)}%
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 0.5, opacity: 0.7, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.5 }}>
                    {title}
                </Typography>

                <Typography variant="h4" fontWeight={950} sx={{ color: "#1e293b", letterSpacing: -1 }}>
                    {unit === "VND" ? formatValue(value) : (
                        <>
                            {unit === "$" && <Typography variant="h5" component="span" fontWeight={900} sx={{ opacity: 0.4 }}>$</Typography>}
                            <CountUp end={value} duration={2} separator="," decimals={unit === "%" ? 1 : 0} />
                            {unit !== "$" && unit !== "" && <Typography variant="h6" component="span" fontWeight={800} sx={{ ml: 0.5, opacity: 0.5 }}>{unit}</Typography>}
                        </>
                    )}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default StatCard;
