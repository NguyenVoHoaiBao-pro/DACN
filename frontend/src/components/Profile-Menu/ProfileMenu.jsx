import {
  AccountBalanceOutlined as AccountBalanceOutlinedIcon,
  AccountCircleOutlined as AccountCircleOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  LocationOnOutlined as LocationOnOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
  NotificationsNoneOutlined as NotificationsNoneOutlinedIcon,
  PaymentOutlined as PaymentOutlinedIcon,
  PersonOutline as PersonOutlineIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";

import { useNavigate } from "react-router-dom";

// Component giờ đây nhận vào một prop tên là `activePage` và `user`
const ProfileMenu = ({ activePage, user }) => {
  const navigate = useNavigate();
  return (
    <Paper elevation={0} sx={{ height: "100%", borderRadius: 0, borderRight: { xs: "none", md: "1px solid #e0e0e0" } }}>
      <List sx={{ p: 1 }}>
        {/* Avatar và thông tin cá nhân */}
        <ListItem
          sx={{ flexDirection: "column", alignItems: "flex-start", py: 2 }}
        >
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: "#673ab7", mr: 2 }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </Avatar>
            <div>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.name || "User"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chỉnh sửa hồ sơ
              </Typography>
            </div>
          </div>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Thông Báo"}>
            <ListItemIcon sx={{ minWidth: 40, color: "#ff6f61" }}>
              <NotificationsNoneOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Thông Báo" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            selected={activePage === "Tài Khoản Của Tôi" || activePage === "Hồ Sơ" || activePage === "Địa Chỉ" || activePage === "Đổi Mật Khẩu"}
            onClick={() => navigate("/profile")}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "#42a5f5" }}>
              <AccountCircleOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Tài Khoản Của Tôi" />
          </ListItemButton>
        </ListItem>

        {/* Sub-items cho Tài Khoản */}
        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Hồ Sơ"} onClick={() => navigate("/profile")}>
            <ListItemIcon sx={{ minWidth: 40, color: "#4caf50" }}>
              <PersonOutlineIcon />
            </ListItemIcon>
            <ListItemText
              primary="Hồ Sơ"
              sx={{ color: activePage === "Hồ Sơ" ? "#ee4d2d" : "inherit" }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Ngân Hàng"}>
            <ListItemIcon sx={{ minWidth: 40, color: "#e91e63" }}>
              <AccountBalanceOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Ngân Hàng" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Địa Chỉ"} onClick={() => navigate("/profile/address")}>
            <ListItemIcon sx={{ minWidth: 40, color: "#ff5722" }}>
              <LocationOnOutlinedIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Địa Chỉ" 
              sx={{ color: activePage === "Địa Chỉ" ? "#ee4d2d" : "inherit" }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Đổi Mật Khẩu"} onClick={() => navigate("/profile/password")}>
            <ListItemIcon sx={{ minWidth: 40, color: "#607d8b" }}>
              <LockOutlinedIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Đổi Mật Khẩu" 
              sx={{ color: activePage === "Đổi Mật Khẩu" ? "#ee4d2d" : "inherit" }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Đơn Mua" || activePage === "Đơn Hàng"} onClick={() => navigate("/user/orders")}>
            <ListItemIcon sx={{ minWidth: 40, color: "#42a5f5" }}>
              <DescriptionOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Đơn Mua" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton selected={activePage === "Kho Voucher"}>
            <ListItemIcon sx={{ minWidth: 40, color: "#ff9800" }}>
              <PaymentOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Kho Voucher" />
          </ListItemButton>
        </ListItem>
      </List>
    </Paper>
  );
};

export default ProfileMenu;
