import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    CircularProgress,
    Typography,
} from "@mui/material";
import {
    ShoppingCart,
    QrCode2,
    AccountBalance,
    AssignmentReturn,
    Shield,
    Inventory,
    LocalShipping,
} from "@mui/icons-material";

const KPI_CONFIG = [
    {
        key: "pendingOrders",
        title: "Đơn chờ xác nhận",
        icon: ShoppingCart,
        color: "#f59e0b",
        path: "/admin/orders?status=PENDING",
        alertIf: (v) => v > 0,
    },
    {
        key: "pendingImeiOrders",
        title: "Chờ gán IMEI",
        icon: QrCode2,
        color: "#8b5cf6",
        path: "/admin/warehouse-fulfillment",
        alertIf: (v) => v > 0,
    },
    {
        key: "pendingRefundCount",
        title: "Hoàn tiền chờ xử lý",
        icon: AccountBalance,
        color: "#ef4444",
        path: "/admin/refunds",
        alertIf: (v) => v > 0,
    },
    {
        key: "pendingReturnReviews",
        title: "Trả hàng chờ duyệt",
        icon: AssignmentReturn,
        color: "#ec4899",
        path: "/admin/sales/return-requests?status=PENDING_SALES_REVIEW",
        alertIf: (v) => v > 0,
    },
    {
        key: "returnsInTransit",
        title: "Trả hàng đang vận chuyển",
        icon: LocalShipping,
        color: "#0ea5e9",
        path: "/admin/sales/return-requests",
        alertIf: () => false,
    },
    {
        key: "openWarrantyClaims",
        title: "Bảo hành đang xử lý",
        icon: Shield,
        color: "#6366f1",
        path: "/admin/warranty-claims",
        alertIf: (v) => v > 0,
    },
    {
        key: "criticalLowStock",
        title: "Tồn kho nguy hiểm",
        icon: Inventory,
        color: "#dc2626",
        path: "/admin/inventory",
        alertIf: (v) => v > 0,
    },
];

const ActionKpiCards = ({ data, loading }) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    lg: "repeat(7, 1fr)",
                },
                gap: 2,
                mb: 3,
            }}
        >
            {KPI_CONFIG.map(({ key, title, icon: Icon, color, path, alertIf }) => {
                const value = data?.[key] ?? 0;
                const isAlert = alertIf(value);
                return (
                    <Card
                        key={key}
                        sx={{
                            borderRadius: 4,
                            boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
                            border: isAlert ? `2px solid ${color}` : "1px solid rgba(0,0,0,0.06)",
                            background: isAlert ? `${color}08` : "rgba(255,255,255,0.9)",
                            transition: "transform 0.2s",
                            "&:hover": { transform: "translateY(-2px)" },
                        }}
                    >
                        <CardActionArea onClick={() => navigate(path)} sx={{ height: "100%" }}>
                            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                    <Typography
                                        variant="caption"
                                        fontWeight={800}
                                        color="text.secondary"
                                        sx={{ textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 1.3 }}
                                    >
                                        {title}
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 0.75,
                                            borderRadius: 2,
                                            bgcolor: `${color}18`,
                                            color,
                                            display: "flex",
                                        }}
                                    >
                                        <Icon sx={{ fontSize: 18 }} />
                                    </Box>
                                </Box>
                                <Typography variant="h5" fontWeight={900} color={isAlert ? color : "text.primary"}>
                                    {value}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                );
            })}
        </Box>
    );
};

export default ActionKpiCards;
