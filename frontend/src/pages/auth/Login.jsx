import {
  Box,
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
} from "@mui/material";
import httpClient from "../../services/httpClient";
import { API_PREFIX } from "../../config/api";
import { applyLoginResponse, isCustomerUser } from "../../utils/authSession";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useForm } from "../../hooks/useForm";
import { loginSuccess, setCart } from "../../redux/appSlice";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import FacebookLogin from "@greatsumini/react-facebook-login";
import FacebookIcon from "@mui/icons-material/Facebook";

const GOOGLE_CLIENT_ID = "805948950640-eaq86ak8dt5qngqks1knbmpvpua77n78.apps.googleusercontent.com";
const FACEBOOK_APP_ID = "1295828555747879";

import { fetchCart } from "../../services/cartService";

const Login = () => {
  const { values, handleChange } = useForm({
    email: "",
    password: "",
  });

  const [loginMethod, setLoginMethod] = useState("password"); // "password" or "qr"
  const [qrToken, setQrToken] = useState("");
  const [qrStatus, setQrStatus] = useState("PENDING");
  const [isFbLoading, setIsFbLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ----- Logic sinh QR Token -----
  const fetchQrToken = async () => {
    try {
      const response = await httpClient.get(`${API_PREFIX}/auth/qr/generate`);
      if (response.data.success) {
        setQrToken(response.data.data.qrToken);
        setQrStatus("PENDING");
      }
    } catch (err) {
      console.error("Lỗi khi tạo mã QR:", err);
    }
  };

  // ----- Logic Polling (Ngồi chờ Điện thoại quét) -----
  useEffect(() => {
    let intervalId;

    if (loginMethod === "qr" && qrToken && qrStatus === "PENDING") {
      intervalId = setInterval(async () => {
        try {
          const res = await httpClient.get(`${API_PREFIX}/auth/qr/status/${qrToken}`);
          if (res.data.success) {
            const status = res.data.data.status;
            setQrStatus(status);

            // NẾU Điện thoại đã CHỐT (VERIFIED)
            if (status === "VERIFIED") {
              clearInterval(intervalId);

              const jwt = res.data.data.accessToken;
              const loginData = res.data.data;
              const { user: userData } = applyLoginResponse({
                accessToken: jwt,
                refreshToken: loginData.refreshToken,
                user: loginData.user,
                roles: loginData.roles,
                permissions: loginData.permissions,
              });
              dispatch(loginSuccess(userData));

              // 3. Tải Giỏ hàng
              try {
                const cart = await fetchCart();
                dispatch(setCart(cart?.items || []));
              } catch (cartErr) {
                console.warn("Lỗi tải giỏ hàng:", cartErr);
              }

              // 4. Kiểm tra quyền và điều hướng
              // Nếu mảng roles chứa ROLE_CUSTOMER thì vứt ra trang chủ. Còn nhân viên (ADMIN, STAFF...) thì vào /admin
              const isCustomer = isCustomerUser(userData);
              if (isCustomer) {
                navigate("/");
              } else {
                navigate("/admin");
              }
            }
          }
        } catch (err) {
          console.error("Lỗi khi Polling check trạng thái QR:", err);
        }
      }, 2000); // 2000ms đếm nhịp 1 lần
    }

    // Dọn dẹp Interval nếu chuyển Tab hoặc rời trang
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loginMethod, qrToken, qrStatus, dispatch, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (values.email === "" || values.password === "") {
      alert("Vui Lòng Nhập Đầy Đủ Thông Tin");
      return;
    }

    try {
      const response = await httpClient.post(`${API_PREFIX}/auth/login`, {
        username: values.email.trim(),
        password: values.password,
      });

      const loginData = response?.data?.data;
      const { user: userData } = applyLoginResponse(loginData);
      dispatch(loginSuccess(userData));

      try {
        const cart = await fetchCart();
        dispatch(setCart(cart?.items || []));
      } catch (cartErr) {
        console.warn("Could not fetch cart after login:", cartErr);
      }

      // Kiểm tra quyền để điều hướng
      // Nếu mảng roles chứa ROLE_CUSTOMER thì vứt ra trang chủ. Còn nhân viên (ADMIN, STAFF...) thì vào /admin
      const isCustomer = isCustomerUser(userData);
      if (isCustomer) {
        navigate("/");
      } else {
        navigate("/admin");
      }
    } catch (error) {
      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Lỗi kết nối máy chủ. Vui lòng thử lại.");
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await httpClient.post(`${API_PREFIX}/auth/google`, {
        idToken: credentialResponse.credential,
      });

      const loginData = response.data.data;
      const { user: userData } = applyLoginResponse(loginData);
      dispatch(loginSuccess(userData));

      try {
        const cart = await fetchCart();
        dispatch(setCart(cart?.items || []));
      } catch (cartErr) {
        console.warn("Could not fetch cart after google login:", cartErr);
      }

      const isCustomer = isCustomerUser(userData);
      if (isCustomer) {
        navigate("/");
      } else {
        navigate("/admin");
      }

    } catch (error) {
      if (error.response) {
        alert("Đăng nhập bằng Google thất bại: " + (error.response.data.message || "Unknown error"));
      } else {
        alert("Cố gắng kết nối Google thất bại. Vui lòng thử lại.");
      }
    }
  };

  const handleGoogleError = () => {
    alert("Đăng nhập bằng Google thất bại, vui lòng thử lại!");
  };

  const handleFacebookSuccess = async (response) => {
    const accessToken = response.accessToken || response.authResponse?.accessToken;
    if (accessToken) {
      setIsFbLoading(true);
      try {
        const res = await httpClient.post(`${API_PREFIX}/auth/facebook`, {
          accessToken,
        });

        if (res.data.success) {
          const loginData = res.data.data;
          const { user: userData } = applyLoginResponse(loginData);
          dispatch(loginSuccess(userData));

          try {
            const cart = await fetchCart();
            dispatch(setCart(cart?.items || []));
          } catch (cartErr) {
            console.warn("Could not fetch cart after facebook login:", cartErr);
          }

          const isCustomer = isCustomerUser(userData);
          if (isCustomer) {
            navigate("/");
          } else {
            navigate("/admin");
          }
        }
      } catch (error) {
        if (error.response) {
          alert("Đăng nhập bằng Facebook thất bại: " + (error.response.data.message || "Unknown error"));
        } else {
          alert("Cố gắng kết nối Facebook thất bại. Vui lòng thử lại.");
        }
      } finally {
        setIsFbLoading(false);
      }
    }
  };

  // Dùng hostname hiện tại (IP mạng LAN) thay vì localhost
  // Để điện thoại có thể truy cập qua cùng mạng WiFi
  const qrUrl = `http://${window.location.hostname}:${window.location.port}/scan-qr?token=${qrToken}`;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
        <Typography variant="h5" sx={{ mb: 1, textAlign: "center" }}>
          Welcome back
        </Typography>

        <Tabs
          value={loginMethod}
          onChange={(e, newValue) => {
            setLoginMethod(newValue);
            if (newValue === "qr") {
              fetchQrToken(); // Vừa bấm tab QR là gọi API xin mã liền
            }
          }}
          centered
          textColor="inherit"
          sx={{ mb: 3, "& .MuiTabs-indicator": { backgroundColor: "#FFC312" } }}
        >
          <Tab value="password" label="Mật Khẩu" />
          <Tab value="qr" label="Mã QR" />
        </Tabs>

        {loginMethod === "password" && (
          <>
            <TextField
              label="Username / Email"
              name="email"
              variant="filled"
              fullWidth
              sx={{
                mb: 2,
                "& .MuiFilledInput-root": {
                  backgroundColor: "white",
                  "&:hover": { backgroundColor: "white" },
                  "&.Mui-focused": { backgroundColor: "white" },
                },
                "& .MuiInputLabel-root.Mui-focused": { color: "black" },
              }}
              value={values.email}
              onChange={handleChange}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              variant="filled"
              fullWidth
              sx={{
                mb: 2,
                "& .MuiFilledInput-root": {
                  backgroundColor: "white",
                  "&:hover": { backgroundColor: "white" },
                  "&.Mui-focused": { backgroundColor: "white" },
                },
                "& .MuiInputLabel-root.Mui-focused": { color: "black" },
              }}
              value={values.password}
              onChange={handleChange}
            />

            <FormControlLabel
              control={
                <Checkbox
                  value="remember"
                  sx={{ color: "white", "&.Mui-checked": { color: "#FFC312" } }}
                />
              }
              label="Remember Me"
            />

            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                backgroundColor: "#FFC312",
                color: "black",
                "&:hover": { backgroundColor: "white" },
              }}
              onClick={handleSubmit}
            >
              Login
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
              <Divider sx={{ flex: 1, borderColor: "rgba(255,255,255,0.2)" }} />
              <Typography variant="body2" sx={{ mx: 2, color: "rgba(255,255,255,0.6)" }}>
                Hoặc
              </Typography>
              <Divider sx={{ flex: 1, borderColor: "rgba(255,255,255,0.2)" }} />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, width: "100%", alignItems: "center" }}>
              <Box sx={{ width: "100%" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  width="100%"
                  theme="filled_blue"
                  text="signin"
                  shape="rectangular"
                />
              </Box>

              <Box sx={{ width: "100%" }}>
                <FacebookLogin
                  appId={FACEBOOK_APP_ID}
                  onSuccess={handleFacebookSuccess}
                  onFail={(error) => console.log("Facebook Login Fail:", error)}
                  render={({ onClick }) => (
                    <Button
                      onClick={onClick}
                      variant="contained"
                      fullWidth
                      disabled={isFbLoading}
                      startIcon={isFbLoading ? <CircularProgress size={18} color="inherit" /> : <FacebookIcon />}
                      sx={{
                        backgroundColor: "#1877F2",
                        color: "white",
                        "&:hover": { backgroundColor: "#115293" },
                        textTransform: "none",
                        height: "40px",
                      }}
                    >
                      {isFbLoading ? "..." : "Facebook"}
                    </Button>
                  )}
                />
              </Box>
            </Box>
          </>
        )}

        {loginMethod === "qr" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Typography variant="body2" sx={{ mb: 2, textAlign: "center", color: "#ccc" }}>
              Mở camera hoặc ứng dụng Zalo trên điện thoại quét mã này để đăng nhập nhanh.
            </Typography>

            <Box sx={{ p: 2, backgroundColor: "white", borderRadius: 2 }}>
              {qrToken ? (
                <QRCodeCanvas value={qrUrl} size={180} />
              ) : (
                <Typography sx={{ color: "black", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Đang tạo mã...
                </Typography>
              )}
            </Box>

            <Button
              variant="text"
              sx={{ mt: 2, color: "#FFC312" }}
              onClick={fetchQrToken}
            >
              Lấy MÃ mới
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2">
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#FFC312", textDecoration: "none" }}>
              Sign Up
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <Link to="/forgot-password" style={{ color: "white", textDecoration: "none" }}>
              Forgot your password?
            </Link>
          </Typography>
        </Box>
      </Card>
    </Box>
    </GoogleOAuthProvider>
  );
};

export default Login;
