import {
  Box,
  Button,
  Card,
  TextField,
  Typography,
} from "@mui/material";
import httpClient from "../../services/httpClient";
import { API_PREFIX } from "../../config/api";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Vui lòng nhập Email");
      return;
    }

    setLoading(true);
    try {
      const response = await httpClient.post(`${API_PREFIX}/auth/forgot-password`, { email });

      if (response.data.success) {
        toast.success(response.data.message || "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu. Kiểm tra hộp thư (cả Spam).");
      } else {
        toast.error(response.data.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
      } else {
        toast.error("Lỗi kết nối máy chủ. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundImage:
          "url('http://getwallpapers.com/wallpaper/full/a/5/d/544750.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card
        sx={{
          p: 4,
          width: 400,
          backgroundColor: "rgba(0,0,0,0.5)",
          color: "white",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, textAlign: "center", fontWeight: "bold" }}>
          Quên Mật Khẩu
        </Typography>

        <Typography variant="body2" sx={{ mb: 3, textAlign: "center", color: "#ccc" }}>
          Vui lòng nhập email của bạn để nhận liên kết đặt lại mật khẩu.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            name="email"
            type="email"
            variant="filled"
            fullWidth
            required
            sx={{
              mb: 3,
              "& .MuiFilledInput-root": {
                backgroundColor: "white",
                "&:hover": { backgroundColor: "white" },
                "&.Mui-focused": { backgroundColor: "white" },
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "black" },
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              backgroundColor: "#FFC312",
              color: "black",
              fontWeight: "bold",
              "&:hover": { backgroundColor: "white" },
              "&.Mui-disabled": { backgroundColor: "rgba(255, 195, 18, 0.5)", color: "rgba(0,0,0,0.5)" }
            }}
          >
            {loading ? "Đang gửi..." : "Gửi Yêu Cầu"}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2">
            Nhớ mật khẩu?{" "}
            <Link to="/login" style={{ color: "#FFC312", textDecoration: "none", fontWeight: "bold" }}>
              Đăng Nhập
            </Link>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default ForgotPassword;
