import { Box, Button, Typography } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f4f6f8",
                padding: 3,
                textAlign: "center",
            }}
        >
            <Box
                sx={{
                    backgroundColor: "#fff",
                    padding: { xs: 4, md: 6 },
                    borderRadius: 4,
                    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    maxWidth: 500,
                }}
            >
                <SecurityIcon
                    color="error"
                    sx={{ fontSize: 100, opacity: 0.9, mb: 2 }}
                />

                <Typography
                    variant="h3"
                    fontWeight={800}
                    color="#d32f2f"
                    gutterBottom
                >
                    403
                </Typography>

                <Typography
                    variant="h5"
                    fontWeight={600}
                    color="#333"
                    gutterBottom
                >
                    Trọng Địa Bảo Mật!
                </Typography>

                <Typography
                    variant="body1"
                    color="#666"
                    sx={{ mb: 4, mt: 1, lineHeight: 1.6 }}
                >
                    Bạn đang cố gắng truy cập vào khu vực không thuộc thẩm quyền của bộ phận mình. Hãy liên hệ với Quản trị viên (Admin) nếu bạn tin rằng đây là một sự nhầm lẫn.
                </Typography>

                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                        sx={{
                            fontWeight: 600,
                            textTransform: "none",
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                        }}
                    >
                        Quay lại
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate("/admin")}
                        sx={{
                            fontWeight: 600,
                            textTransform: "none",
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                        }}
                    >
                        Về Dashboard
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default AccessDenied;
