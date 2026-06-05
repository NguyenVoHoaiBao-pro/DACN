import {
  ShoppingCart as CartIcon,
  FavoriteBorder as FavoriteIcon,
  Logout as LogoutIcon,
  ReceiptLongOutlined as OrderIcon,
  Search as SearchIcon,
  Shuffle as ShuffleIcon,
  ShieldOutlined as ShieldOutlinedIcon,
} from "@mui/icons-material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import {
  AppBar,
  Avatar,
  Badge,
  Box /*...,*/,
  Button,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  logout,
  selectCartItemCount,
  selectCartTotal,
  selectIsLoggedIn,
  selectUser,
  selectWishlistCount,
} from "../../redux/appSlice";
import Logo from "../UI/Logo";
import "./Header.css";

// Map tên danh mục → product_type_id
const categoryIdMap = {
  "Phụ Kiện Điện Tử": 10,
  "Máy Tính & Linh Kiện": 11,
  "Laptop & Desktop": 12,
  "Điện Thoại & Tablet": 13,
  "SmartTV & Thiết Bị Thông Minh": 14,
};

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả danh mục");
  const [anchorEl, setAnchorEl] = useState(null); // Menu dropdown cho user

  //dùng useSelector() để lấy dữ liệu từ store
  const cartItemCount = useSelector(selectCartItemCount);
  const cartTotal = useSelector(selectCartTotal);
  const wishlistCount = useSelector(selectWishlistCount);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  const categories = [
    "Tất cả danh mục",
    "Phụ Kiện Điện Tử",
    "Máy Tính & Linh Kiện",
    "Điện Thoại & Tablet",
    "Laptop & Desktop",
    "SmartTV & Thiết Bị Thông Minh",
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("keyword", searchTerm.trim());
    }
    const catId = categoryIdMap[selectedCategory];
    if (catId) {
      params.set("category", catId.toString());
    }
    navigate(`/shop?${params.toString()}`);
  };

  // 🧠 Thêm Debounce cho Ô Tìm Kiếm live trên Trang Cửa Hàng
  useEffect(() => {
    const handler = setTimeout(() => {
      const isShopPage = window.location.pathname === "/shop";
      if (isShopPage && searchTerm.trim() !== "") {
        const params = new URLSearchParams();
        params.set("keyword", searchTerm.trim());
        const catId = categoryIdMap[selectedCategory];
        if (catId) params.set("category", catId.toString());
        navigate(`/shop?${params.toString()}`, { replace: true });
      }
    }, 500); // delay 500ms theo spec

    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory, navigate]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setAnchorEl(null);
    navigate("/");
  };

  return (
    <AppBar
      position="sticky"
      className="header"
      sx={{
        backgroundColor: "white",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        borderBottom: "1px solid #e8e9ea",
      }}
    >
      <Toolbar
        className="header-container"
        sx={{
          minHeight: "90px !important",
          padding: "0 2rem",
          display: "grid",
          gridTemplateColumns:
            "minmax(200px, 1fr) minmax(500px, 3fr) minmax(280px, 1fr)",
          alignItems: "center",
          gap: "2rem",
          maxWidth: "100%",
          margin: 0,
          width: "100%",
        }}
      >
        {/* Khu vực 1: Logo (Trái) */}
        <Box
          className="header-logo"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <Logo />
        </Box>

        {/* Khu vực 2: Search Bar (Giữa) */}
        <Box
          className="header-search"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: "flex",
              width: "100%",
              maxWidth: "600px",
              backgroundColor: "white",
              border: "2px solid #FF7A00",
              borderRadius: "25px",
              overflow: "hidden",
            }}
          >
            {/* Category Dropdown */}
            <FormControl
              sx={{
                minWidth: 140,
                "& .MuiSelect-select": {
                  padding: "12px 16px",
                  borderRadius: 0,
                  border: "none",
                  "&:focus": {
                    backgroundColor: "transparent",
                  },
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
              }}
            >
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                displayEmpty
                sx={{
                  color: "#666",
                  fontSize: "14px",
                  "& .MuiSelect-icon": {
                    color: "#999",
                  },
                }}
              >
                {categories.map((category) => (
                  <MenuItem
                    key={category}
                    value={category}
                    sx={{ fontSize: "14px" }}
                  >
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search Input */}
            <TextField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Bạn đang tìm kiếm gì?"
              variant="outlined"
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    border: "none",
                    borderLeft: "1px solid #e0e0e0",
                  },
                  "&:hover fieldset": {
                    border: "none",
                    borderLeft: "1px solid #e0e0e0",
                  },
                  "&.Mui-focused fieldset": {
                    border: "none",
                    borderLeft: "1px solid #e0e0e0",
                  },
                },
                "& .MuiInputBase-input": {
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "#333",
                  "&::placeholder": {
                    color: "#999",
                    opacity: 1,
                  },
                },
              }}
            />

            {/* Search Button */}
            <IconButton
              type="submit"
              sx={{
                backgroundColor: "#FF7A00",
                borderRadius: 0,
                padding: "12px 20px",
                "&:hover": {
                  backgroundColor: "#e66900",
                },
              }}
            >
              <SearchIcon sx={{ color: "white", fontSize: "20px" }} />
            </IconButton>
          </Box>
        </Box>

        {/* Khu vực 3: User Actions (Phải) */}
        <Box
          className="header-actions"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "16px",
          }}
        >
          {/* Shuffle Icon */}
          <IconButton sx={{ color: "#666" }} title="Random Product">
            <ShuffleIcon />
          </IconButton>

          {/* Wishlist Icon */}
          <Link
            to="/wishlist"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <IconButton sx={{ color: "#666" }} title="Wishlist">
              <Badge badgeContent={wishlistCount} color="error">
                <FavoriteIcon />
              </Badge>
            </IconButton>
          </Link>

          {/* Cart Icon with Price */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              to="/cart"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <IconButton sx={{ color: "#666" }} title="Shopping Cart">
                <Badge badgeContent={cartItemCount} color="error">
                  <CartIcon />
                </Badge>
              </IconButton>
            </Link>

            <Typography
              variant="h6"
              sx={{
                color: "#333",
                fontWeight: 600,
                fontSize: "16px",
              }}
            >
              {cartTotal.toLocaleString("vi-VN")}đ
            </Typography>
          </Box>

          {isLoggedIn ? (
            <>
              <Button
                onClick={(e) => setAnchorEl(e.currentTarget)}
                startIcon={
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "#D32F2F",
                      fontSize: "14px",
                    }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </Avatar>
                }
                sx={{
                  textTransform: "none",
                  color: "#333",
                  fontWeight: "bold",
                  borderRadius: "20px",
                  px: 2,
                }}
              >
                {user?.name || "User"}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                  sx: { minWidth: 180, mt: 1 },
                }}
              >
                <MenuItem
                  onClick={() => {
                    navigate("/profile");
                    setAnchorEl(null);
                  }}
                >
                  <PersonOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
                  Tài khoản của tôi
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate("/user/orders");
                    setAnchorEl(null);
                  }}
                >
                  <OrderIcon sx={{ mr: 1, fontSize: 20 }} />
                  Đơn hàng của tôi
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate("/user/warranty");
                    setAnchorEl(null);
                  }}
                >
                  <ShieldOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                  Bảo hành & Sửa chữa
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: "#D32F2F" }}>
                  <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                  Đăng xuất
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Link to="/login" style={{ textDecoration: "none" }}>
              <Button
                variant="contained"
                startIcon={<PersonOutlineIcon />}
                sx={{
                  backgroundColor: "#D32F2F",
                  borderRadius: "20px",
                  textTransform: "none",
                  fontWeight: "bold",
                  "&:hover": {
                    backgroundColor: "#B71C1C",
                  },
                }}
              >
                Đăng nhập
              </Button>
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
