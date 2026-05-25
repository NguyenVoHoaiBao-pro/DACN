import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import {
  Alert,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Snackbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addToCart, addToWishlist } from "../../redux/appSlice";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // State cho hiệu ứng snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleAddToWishlist = () => {
    dispatch(addToWishlist(product));
    setSnackbar({
      open: true,
      message: "Đã thêm vào Yêu thích!",
      severity: "info",
    });
  };

  const handleAddToCart = () => {
    dispatch(addToCart(product));
    setSnackbar({
      open: true,
      message: "Đã thêm vào Giỏ hàng!",
      severity: "success",
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`, { state: { product } });
  };

  // Kiểm tra nếu không có product thì không render gì cả
  if (!product) {
    return null;
  }

  return (
    <>
      <Card
        sx={{
          maxWidth: 345,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardActionArea sx={{ flexGrow: 1 }} onClick={handleCardClick}>
          <CardMedia
            component="img"
            height="200"
            image={product.image}
            alt={product.title}
            sx={{
              objectFit: "cover",
            }}
          />
          <CardContent>
            <Typography
              gutterBottom
              variant="h6"
              component="div"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {product.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: "bold", fontSize: "16px", color: "#e63946" }}
            >
              {product.price.toLocaleString("vi-VN")}đ
            </Typography>
          </CardContent>
        </CardActionArea>
        {/* 3. Thêm nút bấm */}
        <CardActions sx={{ justifyContent: "space-between" }}>
          <Button size="small" variant="outlined" onClick={handleAddToCart} sx={{ borderColor: "#f28900", color: "#f28900" }}>
            Thêm Giỏ Hàng
          </Button>
          <Button
            size="small"
            aria-label="add to wishlist"
            onClick={handleAddToWishlist}
            startIcon={<FavoriteBorderIcon />}
          >
            Yêu thích
          </Button>
        </CardActions>
      </Card>
      {/* Hiệu ứng Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={1800}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProductCard;
