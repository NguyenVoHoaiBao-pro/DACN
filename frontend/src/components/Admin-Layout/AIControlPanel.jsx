import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StorageIcon from "@mui/icons-material/Storage";
import GroupIcon from "@mui/icons-material/Group";
import InventoryIcon from "@mui/icons-material/Inventory";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import axios from "axios";
import { usePermissions } from "../../hooks/usePermissions";
import { AI_SERVICE_URL } from "../../config/api";

const AIControlPanel = () => {
    const [modelStatus, setModelStatus] = useState(null);
    const [isRetraining, setIsRetraining] = useState(false);
    const [retrainMessage, setRetrainMessage] = useState("");
    const [retrainSuccess, setRetrainSuccess] = useState(null);

    const { hasPermission } = usePermissions();
    // ROLE_PERM_EDIT is an exclusive admin permission configured in our RBAC DB
    const canManageAI = hasPermission("ROLE_PERM_EDIT");

    // Lấy trạng thái model hiện tại
    const fetchModelStatus = useCallback(async () => {
        try {
            const res = await axios.get(`${AI_SERVICE_URL}/api/model-status`);
            setModelStatus(res.data);
        } catch {
            setModelStatus(null);
        }
    }, []);

    useEffect(() => {
        fetchModelStatus();
        // Refresh chậm hơn — AI service (port 5000) là tùy chọn, không ảnh hưởng dashboard
        const interval = setInterval(fetchModelStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchModelStatus]);

    // Bấm nút Cập nhật AI
    const handleRetrain = async () => {
        setIsRetraining(true);
        setRetrainMessage("");
        setRetrainSuccess(null);
        try {
            const res = await axios.post(`${AI_SERVICE_URL}/api/retrain`);
            setRetrainMessage(res.data.message);
            setRetrainSuccess(true);
            // Sau 3 giây thì tự động fetch lại status
            setTimeout(fetchModelStatus, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || "Lỗi kết nối đến AI Service!";
            setRetrainMessage(msg);
            setRetrainSuccess(false);
        } finally {
            setIsRetraining(false);
        }
    };

    const isTraining = modelStatus?.is_training || isRetraining;

    return (
        <Card
            sx={{
                borderRadius: 3,
                background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
                boxShadow: "0 8px 32px rgba(91, 71, 255, 0.35)",
                color: "#fff",
                mb: 3,
                overflow: "visible",
                position: "relative",
            }}
        >
            {/* Glow decoration */}
            <Box
                sx={{
                    position: "absolute",
                    top: -20,
                    right: 40,
                    width: 120,
                    height: 120,
                    background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                }}
            />

            <CardContent sx={{ p: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: { xs: "flex-start", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        gap: 3,
                    }}
                >
                    {/* Icon + Title */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                background: "rgba(99,102,241,0.25)",
                                border: "1px solid rgba(99,102,241,0.5)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <AutoFixHighIcon sx={{ fontSize: 32, color: "#a78bfa" }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ color: "#fff", lineHeight: 1.2 }}>
                                🤖 AI Recommendation Engine
                            </Typography>
                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", mt: 0.3 }}>
                                Collaborative Filtering — SVD Algorithm v2.0
                            </Typography>
                        </Box>
                    </Box>

                    {/* Stats */}
                    {modelStatus?.model_loaded && (
                        <Box
                            sx={{
                                display: "flex",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                                <GroupIcon sx={{ fontSize: 18, color: "#a78bfa" }} />
                                <Typography variant="body2" sx={{ color: "#ddd" }}>
                                    <strong style={{ color: "#fff" }}>{modelStatus.total_users}</strong> Users
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                                <InventoryIcon sx={{ fontSize: 18, color: "#a78bfa" }} />
                                <Typography variant="body2" sx={{ color: "#ddd" }}>
                                    <strong style={{ color: "#fff" }}>{modelStatus.total_products}</strong> Sản phẩm
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                                <AccessTimeIcon sx={{ fontSize: 18, color: "#a78bfa" }} />
                                <Typography variant="body2" sx={{ color: "#ddd" }}>
                                    Train lúc: <strong style={{ color: "#c4b5fd" }}>{modelStatus.trained_at || "N/A"}</strong>
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Status Chip */}
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", md: "flex-end" }, gap: 1.5 }}>
                        <Chip
                            icon={
                                isTraining ? (
                                    <CircularProgress size={14} sx={{ color: "#fff !important" }} />
                                ) : modelStatus?.model_loaded ? (
                                    <CheckCircleIcon sx={{ fontSize: 16, color: "#fff" }} />
                                ) : (
                                    <StorageIcon sx={{ fontSize: 16, color: "#fff" }} />
                                )
                            }
                            label={
                                isTraining
                                    ? "Đang cập nhật AI..."
                                    : modelStatus?.model_loaded
                                        ? "Model đã sẵn sàng"
                                        : "Chưa kết nối"
                            }
                            sx={{
                                background: isTraining
                                    ? "rgba(251,191,36,0.25)"
                                    : modelStatus?.model_loaded
                                        ? "rgba(34,197,94,0.25)"
                                        : "rgba(239,68,68,0.25)",
                                border: `1px solid ${isTraining
                                    ? "rgba(251,191,36,0.6)"
                                    : modelStatus?.model_loaded
                                        ? "rgba(34,197,94,0.6)"
                                        : "rgba(239,68,68,0.6)"
                                    }`,
                                color: "#fff",
                                fontWeight: 600,
                                "& .MuiChip-icon": { color: "#fff" },
                            }}
                        />

                        {/* Nút Cập nhật AI */}
                        {canManageAI ? (
                            <Button
                                variant="contained"
                                onClick={handleRetrain}
                                disabled={isTraining}
                                startIcon={
                                    isTraining ? (
                                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                                    ) : (
                                        <AutoFixHighIcon />
                                    )
                                }
                                sx={{
                                    background: isTraining
                                        ? "rgba(99,102,241,0.4)"
                                        : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                    color: "#fff",
                                    fontWeight: 700,
                                    px: 3,
                                    py: 1,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontSize: "0.95rem",
                                    boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
                                    "&:hover": {
                                        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                                        boxShadow: "0 6px 20px rgba(99,102,241,0.6)",
                                        transform: "translateY(-2px)",
                                    },
                                    "&:disabled": { color: "rgba(255,255,255,0.5)" },
                                    transition: "all 0.3s ease",
                                }}
                            >
                                {isTraining ? "Đang cập nhật..." : "⚡ Cập nhật AI ngay"}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                disabled
                                startIcon={<AutoFixHighIcon />}
                                sx={{
                                    background: "rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.4)",
                                    fontWeight: 700,
                                    px: 3,
                                    py: 1,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontSize: "0.95rem",
                                }}
                            >
                                🔒 Không có quyền cập nhật
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Thông báo kết quả */}
                {retrainMessage && (
                    <Box
                        sx={{
                            mt: 2,
                            p: 1.5,
                            borderRadius: 2,
                            background: retrainSuccess
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(239,68,68,0.15)",
                            border: `1px solid ${retrainSuccess ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ color: retrainSuccess ? "#86efac" : "#fca5a5" }}
                        >
                            {retrainSuccess ? "✅" : "❌"} {retrainMessage}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default AIControlPanel;
