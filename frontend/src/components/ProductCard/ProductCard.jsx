import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  addToWishlist,
  removeFromWishlist,
  selectIsLoggedIn,
  selectUser,
  selectWishlist,
  setCart,
} from "../../redux/appSlice";
import { addItemToCart } from "../../services/cartService";
import { formatMoney } from "../../utils/formatters";
import { trackView, trackAddToCart } from "../../services/interactionService";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wishlist = useSelector(selectWishlist);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const currentUser = useSelector(selectUser);
  const isInWishlist = wishlist.some((item) => item.id === product.id);

  const handleCardClick = () => {
    // 🧠 AI Tracking: Ghi lại hành vi XEM sản phẩm (1.0 điểm)
    if (currentUser?.id) {
      trackView(currentUser.id, product.id);
    }
    navigate(`/product/${product.id}`, {
      state: { product: product.originalData || product },
    });
  };

  // Xác định thông tin của các Biến thể (Variants) để in giá & Logic nút Thêm
  const variants = product.originalData?.variants || [];
  const hasMultipleVariants = variants.length > 1;

  // Thuật toán lấy giá nhỏ nhất làm Giá khởi điểm "Từ XX.XXX đ"
  const minPrice = variants.length > 0
    ? Math.min(...variants.map(v => v.price).filter(p => p != null && !isNaN(p)))
    : product.price;

  const displayPriceText = hasMultipleVariants
    ? `Từ ${formatMoney(minPrice)}`
    : formatMoney(product.price);

  // Xử lý nút Hành Động chính (Thêm vào Giỏ hoặc Chọn Loại)
  const handlePrimaryAction = async (e) => {
    e.stopPropagation();

    if (hasMultipleVariants || variants.length === 0) {
      // Bắt buộc dẫn vào trang chi tiết để thao tác chọn Cấu hình / Màu sắc
      navigate(`/product/${product.id}`, {
        state: { product: product.originalData || product },
      });
    } else {
      // Chỉ có duy nhất 1 Variante -> Cho phép Add nhanh vô Giỏ (Quick Add)
      if (!isLoggedIn) {
        alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
        navigate("/login");
        return;
      }
      try {
        const cart = await addItemToCart(variants[0].id, 1);
        dispatch(setCart(cart.items || []));
        if (currentUser?.id) {
          trackAddToCart(currentUser.id, Number(product.id));
        }
        alert("Đã thêm " + product.name + " vào giỏ hàng!");
      } catch (err) {
        console.error("Quick Add to cart failed:", err);
        alert(err.response?.data?.message || "Không thể thêm vào giỏ hàng");
      }
    }
  };

  return (
    <Card
      sx={{
        p: 1.5,
        border: "1px solid #eee",
        borderRadius: 2,
        height: "100%", // Cho phép component tự co giãn
        display: "flex",
        flexDirection: "column",
        width: "100%",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1)",
          "& .product-image": { transform: "scale(1.05)" },
          "& .product-badge": { transform: "scale(1.1) rotate(-3deg)" },
          "& .product-actions-hover": {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
      }}
      onClick={handleCardClick}
    >
      <Box
        sx={{
          position: "relative",
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fff", // White background is usually better for product images
        }}
      >
        {product.badge && (
          <Box
            className="product-badge"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: product.badge === "Sale" ? "#ef2f06" : "#f28900",
              color: "#fff",
              px: 1.2,
              py: 0.4,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              zIndex: 1,
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            }}
          >
            {product.badge}
          </Box>
        )}
        <CardMedia
          component="img"
          image={product.image}
          alt={product.name}
          className="product-image"
          sx={{
            height: 190,
            width: "100%",
            objectFit: "contain",
            borderRadius: 1,
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            mixBlendMode: "multiply",
          }}
          onError={(e) => {
            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
      </Box>
      <CardContent
        sx={{
          textAlign: "left", // Căn lề trái chuẩn Premium
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px 16px 12px 16px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            flexGrow: 1,
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", mb: 1, gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: "#f28900", // Màu thương hiệu
                fontWeight: 800,
                bgcolor: "#fff3e0", // Nền cam nhạt tone sang
                px: 1.2,
                py: 0.5,
                borderRadius: "6px",
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                border: "1px solid #ffe0b2", // Viền mờ cho nổi bật
              }}
            >
              {product.category}
            </Typography>

            {product.soldCount > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: "#dc2626", // Màu đỏ nổi bật giống sàn TMĐT
                  fontWeight: 800,
                  fontSize: "0.725rem",
                  bgcolor: "#fef2f2", // Nền đỏ hồng ấm
                  px: 1,
                  py: 0.5,
                  borderRadius: "6px",
                  border: "1px solid #fee2e2"
                }}
              >
                Đã bán {product.soldCount}
              </Typography>
            )}
          </Box>

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              fontSize: "0.9rem",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              color: "#1e293b",
              height: "40px", // Cố định chiều cao tránh lệch card
            }}
          >
            {product.name}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start", // Căn lề trái giá tiền
            gap: 1,
            alignItems: "baseline",
            mt: "auto",
            pt: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ 
              color: "#d32f2f", // Màu Đỏ Đậm chuyên nghiệp Mall/Lazada/Shopee nhìn chân thật hơn orange
              fontWeight: 800, 
              fontSize: "1rem" 
            }}
          >
            {displayPriceText}
          </Typography>
          {!hasMultipleVariants && (
            <Typography
              variant="caption"
              sx={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.75rem" }}
            >
              {formatMoney(product.oldPrice)}
            </Typography>
          )}
        </Box>
      </CardContent>
      <CardActions
        sx={{
          justifyContent: "space-between",
          padding: "0 16px 16px 16px",
          gap: 1,
          opacity: 0,
          transform: "translateY(10px)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="product-actions-hover"
      >
        <Button
          variant="contained"
          size="small"
          startIcon={hasMultipleVariants ? undefined : <ShoppingCartIcon />}
          sx={{
            flexGrow: 1,
            height: 38,
            borderRadius: 5,
            textTransform: "none",
            fontWeight: 600,
            bgcolor: "#f28900",
            boxShadow: "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              bgcolor: "#e67c00",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 16px rgba(242, 137, 0, 0.3)",
            },
            "&:active": {
              transform: "translateY(0px)",
            },
          }}
          onClick={handlePrimaryAction}
        >
          {hasMultipleVariants ? "Chọn Loại" : "Thêm"}
        </Button>

        <IconButton
          size="small"
          sx={{
            border: "1px solid #ebebeb",
            bgcolor: "#fff",
            color: "#f28900",
            width: 38,
            height: 38,
            "&:hover": {
              bgcolor: "#f28900",
              color: "#fff",
              borderColor: "#f28900",
            },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ShuffleIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          sx={{
            border: "1px solid #ebebeb",
            bgcolor: isInWishlist ? "#f28900" : "#fff",
            color: isInWishlist ? "#fff" : "#f28900",
            width: 38,
            height: 38,
            "&:hover": {
              bgcolor: isInWishlist ? "#e67c00" : "#f28900",
              color: "#fff",
              borderColor: "#f28900",
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isInWishlist) {
              dispatch(removeFromWishlist(product.id));
            } else {
              dispatch(
                addToWishlist({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                  category: product.category,
                  originalData: product.originalData,
                }),
              );
            }
          }}
        >
          {isInWishlist ? (
            <FavoriteIcon fontSize="small" />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default ProductCard;
