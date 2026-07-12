import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";
import ProfileMenu from "../../components/Profile-Menu/ProfileMenu.jsx";
import { selectUser } from "../../redux/appSlice.js";
import { changeMyPassword } from "../../services/userService.js";

const ChangePasswordForm = () => {
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleChangePassword = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setSnackbar({ open: true, message: "Vui lòng điền đầy đủ thông tin!", severity: "error" });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({ open: true, message: "Mật khẩu xác nhận không khớp!", severity: "error" });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeMyPassword({
        currentPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });
      setSnackbar({ open: true, message: res.message || "Đổi mật khẩu thành công!", severity: "success" });
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const data = error.response?.data;
      const fieldErrors = data?.data;
      let msg = data?.message || "Đổi mật khẩu thất bại. Mật khẩu cũ không đúng.";
      if (fieldErrors && typeof fieldErrors === "object") {
        const first = Object.values(fieldErrors)[0];
        if (first) msg = first;
      }
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Paper sx={{ p: 4, height: "100%" }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Đổi Mật Khẩu
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
      </Typography>

      <Box sx={{ maxWidth: 500, mt: 2 }}>
        <TextField
          label="Mật khẩu hiện tại"
          type="password"
          fullWidth
          margin="normal"
          value={passwordData.oldPassword}
          onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
        />
        <TextField
          label="Mật khẩu mới"
          type="password"
          fullWidth
          margin="normal"
          value={passwordData.newPassword}
          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
        />
        <TextField
          label="Xác nhận mật khẩu mới"
          type="password"
          fullWidth
          margin="normal"
          value={passwordData.confirmPassword}
          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={changingPassword}
            sx={{
              backgroundColor: "#ee4d2d",
              "&:hover": { backgroundColor: "#d73112" },
              px: 5,
            }}
          >
            {changingPassword ? <CircularProgress size={24} color="inherit" /> : "Xác nhận"}
          </Button>
        </Box>
      </Box>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

// --- Main Page Wrapper ---
const ChangePasswordPage = () => {
  const user = useSelector(selectUser);

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, md: 3 },
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "stretch",
          gap: 0,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: { xs: "100%", md: 260 }, minWidth: { md: 260 } }}>
          <ProfileMenu activePage="Đổi Mật Khẩu" user={user} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ChangePasswordForm />
        </Box>
      </Box>
    </Box>
  );
};

export default ChangePasswordPage;
