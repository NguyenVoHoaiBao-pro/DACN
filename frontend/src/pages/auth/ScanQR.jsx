import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import httpClient from "../../services/httpClient";
import { API_PREFIX } from "../../config/api";
import { applyLoginResponse } from "../../utils/authSession";

/**
 * Trang ScanQR - Hiển thị khi điện thoại quét mã QR từ màn hình PC
 *
 * Luồng hoạt động:
 * 1. PC hiện QR Code chứa URL: http://localhost:5173/scan-qr?token=abc-xyz
 * 2. Điện thoại quét QR → mở trang này
 * 3. User đăng nhập trên điện thoại (nếu chưa login)
 * 4. Bấm "Xác nhận đăng nhập vào PC"
 * 5. Gọi API POST /api/auth/qr/verify → PC tự động nhận JWT
 */
const ScanQR = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const qrToken = searchParams.get("token");

    // State cho form đăng nhập trên điện thoại
    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Trạng thái xác thực
    const [step, setStep] = useState("login"); // "login" | "confirm" | "success" | "error"
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [message, setMessage] = useState("");

    // --- Bước 1: Đăng nhập trên điện thoại ---
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!usernameOrEmail || !password) {
            setMessage("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await httpClient.post(`${API_PREFIX}/auth/login`, {
                username: usernameOrEmail.trim(),
                password,
            });

            const loginData = response?.data?.data;
            const userData = loginData?.user || loginData;

            setLoggedInUser(userData);
            setStep("confirm"); // Chuyển sang bước xác nhận
        } catch (error) {
            if (error.response) {
                setMessage(error.response.data.message || "Sai tài khoản hoặc mật khẩu!");
            } else {
                setMessage("Lỗi kết nối máy chủ. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Bước 2: Xác nhận đăng nhập vào PC ---
    const handleConfirmLogin = async () => {
        if (!loggedInUser || !qrToken) return;

        setLoading(true);
        setMessage("");

        try {
            const response = await httpClient.post(
                `${API_PREFIX}/auth/qr/verify?token=${qrToken}&userId=${loggedInUser.id}`,
            );

            if (response.data.success) {
                setStep("success");
                setMessage("Đăng nhập vào máy tính thành công! Bạn có thể đóng trang này.");
            }
        } catch (error) {
            setStep("error");
            if (error.response) {
                setMessage(error.response.data.message || "Xác thực thất bại!");
            } else {
                setMessage("Lỗi kết nối. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Không có token trong URL ---
    if (!qrToken) {
        return (
            <Box sx={styles.container}>
                <Card sx={styles.card}>
                    <ErrorOutlineIcon sx={{ fontSize: 60, color: "#ff4444", mb: 2 }} />
                    <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
                        Mã QR không hợp lệ
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#aaa", mt: 1, textAlign: "center" }}>
                        Vui lòng quét lại mã QR từ màn hình đăng nhập trên máy tính.
                    </Typography>
                    <Button
                        variant="contained"
                        sx={styles.primaryBtn}
                        onClick={() => navigate("/login")}
                    >
                        Về trang Đăng nhập
                    </Button>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={styles.container}>
            <Card sx={styles.card}>
                {/* ===== HEADER ===== */}
                <QrCodeScannerIcon sx={{ fontSize: 48, color: "#FFC312", mb: 1 }} />
                <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, mb: 0.5 }}>
                    Đăng nhập QR Code
                </Typography>
                <Typography variant="body2" sx={{ color: "#aaa", mb: 3, textAlign: "center" }}>
                    Xác nhận để đăng nhập vào máy tính
                </Typography>

                {/* ===== BƯỚC 1: ĐĂNG NHẬP ===== */}
                {step === "login" && (
                    <Box component="form" onSubmit={handleLogin} sx={{ width: "100%" }}>
                        <TextField
                            label="Username hoặc Email"
                            variant="filled"
                            fullWidth
                            value={usernameOrEmail}
                            onChange={(e) => setUsernameOrEmail(e.target.value)}
                            sx={styles.textField}
                        />
                        <TextField
                            label="Mật khẩu"
                            type="password"
                            variant="filled"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={styles.textField}
                        />

                        {message && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {message}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            sx={styles.primaryBtn}
                        >
                            {loading ? (
                                <CircularProgress size={24} sx={{ color: "#000" }} />
                            ) : (
                                "Đăng nhập"
                            )}
                        </Button>
                    </Box>
                )}

                {/* ===== BƯỚC 2: XÁC NHẬN ===== */}
                {step === "confirm" && loggedInUser && (
                    <Box sx={{ width: "100%", textAlign: "center" }}>
                        <Box
                            sx={{
                                p: 2,
                                mb: 3,
                                borderRadius: 2,
                                backgroundColor: "rgba(255, 195, 18, 0.1)",
                                border: "1px solid rgba(255, 195, 18, 0.3)",
                            }}
                        >
                            <Typography variant="body2" sx={{ color: "#aaa", mb: 0.5 }}>
                                Đang đăng nhập với tài khoản:
                            </Typography>
                            <Typography variant="h6" sx={{ color: "#FFC312", fontWeight: 700 }}>
                                {loggedInUser.username}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#ccc" }}>
                                {loggedInUser.email}
                            </Typography>
                        </Box>

                        <Alert severity="warning" sx={{ mb: 3, textAlign: "left" }}>
                            Bạn có chắc muốn đăng nhập vào máy tính không? Chỉ xác nhận nếu bạn
                            đang nhìn thấy mã QR trên màn hình máy tính của mình.
                        </Alert>

                        {message && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {message}
                            </Alert>
                        )}

                        <Button
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            onClick={handleConfirmLogin}
                            sx={styles.primaryBtn}
                        >
                            {loading ? (
                                <CircularProgress size={24} sx={{ color: "#000" }} />
                            ) : (
                                "✅ Xác nhận đăng nhập vào PC"
                            )}
                        </Button>

                        <Button
                            variant="text"
                            fullWidth
                            sx={{ mt: 1, color: "#aaa" }}
                            onClick={() => {
                                setStep("login");
                                setLoggedInUser(null);
                            }}
                        >
                            Đổi tài khoản khác
                        </Button>
                    </Box>
                )}

                {/* ===== BƯỚC 3: THÀNH CÔNG ===== */}
                {step === "success" && (
                    <Box sx={{ textAlign: "center" }}>
                        <CheckCircleOutlineIcon
                            sx={{ fontSize: 80, color: "#4CAF50", mb: 2 }}
                        />
                        <Typography variant="h6" sx={{ color: "#4CAF50", fontWeight: 700, mb: 1 }}>
                            Thành công!
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#ccc", mb: 3 }}>
                            {message}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#888" }}>
                            Máy tính sẽ tự động đăng nhập trong giây lát...
                        </Typography>
                    </Box>
                )}

                {/* ===== LỖI ===== */}
                {step === "error" && (
                    <Box sx={{ textAlign: "center" }}>
                        <ErrorOutlineIcon sx={{ fontSize: 80, color: "#ff4444", mb: 2 }} />
                        <Typography variant="h6" sx={{ color: "#ff4444", fontWeight: 700, mb: 1 }}>
                            Xác thực thất bại!
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#ccc", mb: 3 }}>
                            {message}
                        </Typography>
                        <Button
                            variant="contained"
                            sx={styles.primaryBtn}
                            onClick={() => navigate("/login")}
                        >
                            Quay lại trang đăng nhập
                        </Button>
                    </Box>
                )}
            </Card>
        </Box>
    );
};

// ===== STYLES =====
const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        p: 2,
    },
    card: {
        p: 4,
        width: "100%",
        maxWidth: 400,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    textField: {
        mb: 2,
        "& .MuiFilledInput-root": {
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 1,
            "&:hover": { backgroundColor: "rgba(255,255,255,1)" },
            "&.Mui-focused": { backgroundColor: "rgba(255,255,255,1)" },
        },
        "& .MuiInputLabel-root.Mui-focused": { color: "#333" },
    },
    primaryBtn: {
        mt: 2,
        py: 1.5,
        backgroundColor: "#FFC312",
        color: "#000",
        fontWeight: 700,
        fontSize: "1rem",
        "&:hover": { backgroundColor: "#e6af00" },
    },
};

export default ScanQR;
