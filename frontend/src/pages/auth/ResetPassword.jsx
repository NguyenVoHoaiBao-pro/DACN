import {
  Box,
  Button,
  Card,
  TextField,
  Typography,
} from "@mui/material";
import httpClient from "../../services/httpClient";
import { API_PREFIX } from "../../config/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Mã khôi phục mật khẩu không hợp lệ!");
      navigate("/login");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (password.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    try {
      const response = await httpClient.post(`${API_PREFIX}/auth/reset-password`, {
        token,
        newPassword: password,
        confirmPassword,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Đã đặt lại mật khẩu thành công!");
        setTimeout(() => {
          navigate("/login");
        }, 2500);
      } else {
        toast.error(response.data.message || "Đã có lỗi xảy ra");
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || "Mã khôi phục mật khẩu không hợp lệ hoặc đã hết hạn!");
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
          Đặt Lại Mật Khẩu
        </Typography>

        <Typography variant="body2" sx={{ mb: 3, textAlign: "center", color: "#ccc" }}>
          Nhập mật khẩu mới cho tài khoản của bạn.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Mật Khẩu Mới"
            name="password"
            type="password"
            variant="filled"
            fullWidth
            required
            sx={{
              mb: 2,
              "& .MuiFilledInput-root": {
                backgroundColor: "white",
                "&:hover": { backgroundColor: "white" },
                "&.Mui-focused": { backgroundColor: "white" },
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "black" },
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextField
            label="Xác Nhận Mật Khẩu"
            name="confirmPassword"
            type="password"
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Đang xử lý..." : "Đặt Lại Mật Khẩu"}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2">
            <Link to="/login" style={{ color: "#FFC312", textDecoration: "none", fontWeight: "bold" }}>
              Quay lại Đăng Nhập
            </Link>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default ResetPassword;
