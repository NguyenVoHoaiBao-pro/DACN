import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProfileMenu from "../../components/Profile-Menu/ProfileMenu.jsx";
import { loginSuccess, selectUser } from "../../redux/appSlice.js";
import { getMyProfile, updateMyProfile } from "../../services/userService.js";

// --- Component 2: Form ở giữa ---
const ProfileForm = () => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "",
    address: "",
    day: "",
    month: "",
    year: "",
  });

  // Username & email (chỉ hiển thị, không sửa được)
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // Tạo danh sách ngày, tháng, năm
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  // Fetch profile từ API khi component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        const user = res.data;

        setUsername(user.username || "");
        setEmail(user.email || "");

        // Parse birth date (assuming ISO format yyyy-MM-dd)
        let day = "", month = "", year = "";
        if (user.birthAt || user.birth) {
          const birthDate = new Date(user.birthAt || user.birth);
          day = birthDate.getDate();
          month = birthDate.getMonth() + 1;
          year = birthDate.getFullYear();
        }

        setFormData({
          fullName: user.fullName || user.name || "",
          phone: user.phone || "",
          gender: user.gender || "Khác",
          address: user.address || "",
          day,
          month,
          year,
        });
      } catch (error) {
        console.error("Lỗi khi lấy profile:", error);
        setSnackbar({
          open: true,
          message: error.response?.data?.message || "Không thể tải thông tin profile",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build birth date string (yyyy-MM-dd)
      let birthAt = null;
      if (formData.day && formData.month && formData.year) {
        const m = String(formData.month).padStart(2, "0");
        const d = String(formData.day).padStart(2, "0");
        birthAt = `${formData.year}-${m}-${d}`;
      }

      const updatePayload = {
        fullName: formData.fullName,
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address,
        birthAt,
      };

      const res = await updateMyProfile(updatePayload);
      const updatedUser = res.data;

      // Cập nhật Redux & localStorage
      dispatch(loginSuccess(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setSnackbar({
        open: true,
        message: res.message || "Cập nhật hồ sơ thành công!",
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật profile:", error);
      const msg = error.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper
        sx={{
          p: 4,
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  // Mask email: ho********@gmail.com
  const maskEmail = (em) => {
    if (!em) return "";
    const [local, domain] = em.split("@");
    if (local.length <= 2) return em;
    return local.slice(0, 2) + "********@" + domain;
  };

  return (
    <Paper sx={{ p: 4, height: "100%" }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Hồ Sơ Của Tôi
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Quản lý thông tin hồ sơ để bảo mật tài khoản
      </Typography>

      {/* Tên đăng nhập - chỉ đọc */}
      <TextField
        label="Tên đăng nhập"
        value={username}
        disabled
        helperText="Tên đăng nhập chỉ có thể thay đổi một lần."
        fullWidth
        margin="normal"
      />

      {/* Họ tên */}
      <TextField
        label="Họ tên"
        name="fullName"
        value={formData.fullName}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      {/* Email - chỉ hiển thị masked */}
      <Box sx={{ display: "flex", alignItems: "center", my: "16px" }}>
        <Typography sx={{ flexGrow: 1 }}>Email: {maskEmail(email)}</Typography>
      </Box>

      {/* Số điện thoại */}
      <TextField
        label="Số điện thoại"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      {/* Địa chỉ */}
      <TextField
        label="Địa chỉ"
        name="address"
        value={formData.address}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      {/* Giới tính */}
      <FormControl margin="normal">
        <FormLabel>Giới tính</FormLabel>
        <RadioGroup
          row
          name="gender"
          value={formData.gender}
          onChange={handleChange}
        >
          <FormControlLabel value="Nam" control={<Radio />} label="Nam" />
          <FormControlLabel value="Nữ" control={<Radio />} label="Nữ" />
          <FormControlLabel value="Khác" control={<Radio />} label="Khác" />
        </RadioGroup>
      </FormControl>

      {/* Ngày sinh */}
      <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Ngày</InputLabel>
          <Select
            label="Ngày"
            name="day"
            value={formData.day}
            onChange={handleChange}
          >
            {days.map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Tháng</InputLabel>
          <Select
            label="Tháng"
            name="month"
            value={formData.month}
            onChange={handleChange}
          >
            {months.map((month) => (
              <MenuItem key={month} value={month}>
                {`Tháng ${month}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Năm</InputLabel>
          <Select
            label="Năm"
            name="year"
            value={formData.year}
            onChange={handleChange}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Nút lưu */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            backgroundColor: "#ee4d2d",
            "&:hover": { backgroundColor: "#d73112" },
            px: 5,
          }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : "Lưu"}
        </Button>
      </Box>

      {/* Snackbar thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Paper>
  );
};

// --- Component chính: Sắp xếp 3 component vào Grid ---
const ProfilePage = () => {
  const user = useSelector(selectUser);

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: 3,
        backgroundColor: "#f9f9f9",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Grid container spacing={0} sx={{ maxWidth: 1200 }}>
        {/* Cột 1: Menu */}
        <Grid item xs={12} md={3}>
          <ProfileMenu activePage="Hồ Sơ" user={user} />
        </Grid>
        {/* Cột 2: Form */}
        <Grid item xs={12} md={9}>
          <ProfileForm />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
