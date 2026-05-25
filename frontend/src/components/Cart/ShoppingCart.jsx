import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { selectIsLoggedIn, setCart } from "../../redux/appSlice";
import {
  fetchCart,
  removeCartItem,
  updateCartItem,
} from "../../services/cartService";
import { formatMoney } from "../../utils/formatters";

const FREE_SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE = 30000;

function ShoppingCart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCartItems([]);
      setLoading(false);
      return;
    }
    try {
      const cart = await fetchCart();
      const items = cart?.items || [];
      setCartItems(items);
      dispatch(setCart(items));
    } catch (err) {
      console.error("Lỗi khi tải giỏ hàng:", err);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, dispatch]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleRemoveItem = async (cartItemId) => {
    if (!cartItemId) return;
    setRemovingId(cartItemId);
    try {
      const cart = await removeCartItem(cartItemId);
      const items = cart?.items || [];
      setCartItems(items);
      dispatch(setCart(items));
    } catch (err) {
      console.error("Lỗi khi xoá item:", err);
      alert(err.response?.data?.message || "Không thể xoá sản phẩm");
    } finally {
      setRemovingId(null);
    }
  };

  const handleQuantityChange = async (cartItemId, newQuantity) => {
    if (isNaN(newQuantity) || newQuantity < 1) return;
    setUpdatingId(cartItemId);
    try {
      const cart = await updateCartItem(cartItemId, newQuantity);
      const items = cart?.items || [];
      setCartItems(items);
      dispatch(setCart(items));
    } catch (err) {
      console.error("Lỗi khi cập nhật số lượng:", err);
      alert(err.response?.data?.message || "Không thể cập nhật số lượng");
    } finally {
      setUpdatingId(null);
    }
  };

  // Tính toán
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0),
    0,
  );
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const shippingProgress = Math.min(
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
    100,
  );

  // ─── Loading ───
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress sx={{ color: "#f28900" }} />
      </Box>
    );
  }

  // ─── Chưa đăng nhập ───
  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          maxWidth: 500,
          mx: "auto",
          mt: 10,
          textAlign: "center",
          p: 4,
        }}
      >
        <ShoppingCartOutlinedIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#333", mb: 1 }}>
          Vui lòng đăng nhập
        </Typography>
        <Typography sx={{ color: "#888", mb: 3 }}>
          Bạn cần đăng nhập để xem giỏ hàng của mình
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          to="/login"
          sx={{
            bgcolor: "#f28900",
            "&:hover": { bgcolor: "#e67c00" },
            px: 5,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          Đăng nhập ngay
        </Button>
      </Box>
    );
  }

  // ─── Giỏ hàng trống ───
  if (cartItems.length === 0) {
    return (
      <Box
        sx={{
          maxWidth: 500,
          mx: "auto",
          mt: 10,
          textAlign: "center",
          p: 4,
        }}
      >
        <ShoppingCartOutlinedIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#333", mb: 1 }}>
          Giỏ hàng trống
        </Typography>
        <Typography sx={{ color: "#888", mb: 3 }}>
          Hãy khám phá cửa hàng và thêm sản phẩm yêu thích vào giỏ
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          to="/shop"
          sx={{
            bgcolor: "#f28900",
            "&:hover": { bgcolor: "#e67c00" },
            px: 5,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          Khám phá cửa hàng
        </Button>
      </Box>
    );
  }

  // ─── Giỏ hàng có sản phẩm ───
  return (
    <Box
      sx={{
        maxWidth: 1280,
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: 3,
      }}
    >
      {/* Title */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#333", mb: 0.5 }}>
        Giỏ hàng
      </Typography>
      <Typography variant="body2" sx={{ color: "#888", mb: 3 }}>
        Bạn có {cartItems.length} sản phẩm trong giỏ hàng
      </Typography>

      {/* Free shipping progress bar */}
      {!freeShipping && (
        <Box
          sx={{
            bgcolor: "#fff8ef",
            border: "1px solid #ffe0b2",
            borderRadius: 2,
            p: 2,
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <LocalShippingOutlinedIcon sx={{ color: "#f28900" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ color: "#333", mb: 0.5 }}>
              Mua thêm{" "}
              <strong>{formatMoney(FREE_SHIPPING_THRESHOLD - subtotal)}</strong>{" "}
              để được{" "}
              <strong style={{ color: "#2e7d32" }}>miễn phí vận chuyển</strong>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={shippingProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "#ffe0b2",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "#f28900",
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        </Box>
      )}

      {freeShipping && (
        <Box
          sx={{
            bgcolor: "#e8f5e9",
            border: "1px solid #c8e6c9",
            borderRadius: 2,
            p: 1.5,
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <LocalShippingOutlinedIcon sx={{ color: "#2e7d32" }} />
          <Typography
            variant="body2"
            sx={{ color: "#2e7d32", fontWeight: 600 }}
          >
            Bạn được miễn phí vận chuyển!
          </Typography>
        </Box>
      )}

      {/* Main layout: 2 cột */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        {/* ═══ CỘT TRÁI: Danh sách sản phẩm ═══ */}
        <Box sx={{ flex: 1, width: "100%" }}>
          {/* Table header (desktop) */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              px: 3,
              py: 1.5,
              bgcolor: "#fafafa",
              borderRadius: "12px 12px 0 0",
              border: "1px solid #eee",
              borderBottom: "none",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                flex: 4,
                fontWeight: 600,
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Sản phẩm
            </Typography>
            <Typography
              variant="caption"
              sx={{
                flex: 2,
                fontWeight: 600,
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              Đơn giá
            </Typography>
            <Typography
              variant="caption"
              sx={{
                flex: 2,
                fontWeight: 600,
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              Số lượng
            </Typography>
            <Typography
              variant="caption"
              sx={{
                flex: 2,
                fontWeight: 600,
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                textAlign: "right",
              }}
            >
              Thành tiền
            </Typography>
            <Box sx={{ width: 48 }} />
          </Box>

          {/* Cart items */}
          <Box
            sx={{
              bgcolor: "#fff",
              border: "1px solid #eee",
              borderRadius: { xs: 3, md: "0 0 12px 12px" },
            }}
          >
            {cartItems.map((item, index) => (
              <Box
                key={item.id}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderBottom:
                    index < cartItems.length - 1 ? "1px solid #f5f5f5" : "none",
                  opacity: removingId === item.id ? 0.4 : 1,
                  transition: "opacity 0.3s ease",
                  "&:hover": { bgcolor: "#fafafa" },
                }}
              >
                {/* ─── Desktop view ─── */}
                <Box
                  sx={{
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                  }}
                >
                  {/* Product info */}
                  <Box
                    sx={{
                      flex: 4,
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid #f0f0f0",
                        flexShrink: 0,
                        bgcolor: "#fff",
                      }}
                    >
                      <img
                        src={
                          item.variant?.imageUrl ||
                          "https://placehold.co/80x80?text=No+Image"
                        }
                        alt={item.variant?.product?.name || "Sản phẩm"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: "#333",
                          fontSize: "0.95rem",
                          lineHeight: 1.3,
                          mb: 0.5,
                          cursor: "pointer",
                          "&:hover": { color: "#f28900" },
                        }}
                        onClick={() => {
                          const pid = item.variant?.product?.id;
                          if (pid) navigate(`/product/${pid}`);
                        }}
                      >
                        {item.variant?.product?.name || "Sản phẩm"}
                      </Typography>
                      {item.variant?.variantName && (
                        <Chip
                          label={item.variant.variantName}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.75rem",
                            bgcolor: "#f5f5f5",
                            color: "#666",
                            mb: 0.5,
                            mr: 0.5,
                          }}
                        />
                      )}
                      {item.variant?.attributeValues?.map(attr => (
                        <Chip
                          key={attr.id}
                          label={`${attr.value}`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.75rem",
                            bgcolor: "#e0f7fa",
                            color: "#006064",
                            mb: 0.5,
                            mr: 0.5,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Unit price */}
                  <Box sx={{ flex: 2, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 600, color: "#f28900" }}>
                      {formatMoney(item.unitPrice)}
                    </Typography>
                  </Box>

                  {/* Quantity */}
                  <Box
                    sx={{
                      flex: 2,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1 || updatingId === item.id}
                        sx={{ borderRadius: 0, width: 36, height: 36 }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography
                        sx={{
                          width: 40,
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          userSelect: "none",
                        }}
                      >
                        {updatingId === item.id ? "..." : item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity + 1)
                        }
                        disabled={updatingId === item.id}
                        sx={{ borderRadius: 0, width: 36, height: 36 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>

                  {/* Subtotal */}
                  <Box sx={{ flex: 2, textAlign: "right" }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#333",
                        fontSize: "1rem",
                      }}
                    >
                      {formatMoney(item.unitPrice * item.quantity)}
                    </Typography>
                  </Box>

                  {/* Delete */}
                  <Box sx={{ width: 48, textAlign: "center" }}>
                    <IconButton
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingId === item.id}
                      sx={{
                        color: "#bbb",
                        "&:hover": { color: "#ff4757", bgcolor: "#fff0f0" },
                        transition: "all 0.2s",
                      }}
                      size="small"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* ─── Mobile view ─── */}
                <Box sx={{ display: { xs: "block", md: "none" } }}>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box
                      sx={{
                        width: 90,
                        height: 90,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid #f0f0f0",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={
                          item.variant?.imageUrl ||
                          "https://placehold.co/90x90?text=No+Image"
                        }
                        alt={item.variant?.product?.name || "Sản phẩm"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: "#333",
                          fontSize: "0.9rem",
                          lineHeight: 1.3,
                          mb: 0.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.variant?.product?.name || "Sản phẩm"}
                      </Typography>
                      {item.variant?.variantName && (
                        <Typography variant="caption" sx={{ color: "#999", mr: 1 }}>
                          {item.variant.variantName}
                        </Typography>
                      )}
                      {item.variant?.attributeValues?.map(attr => (
                        <Typography key={attr.id} variant="caption" sx={{ color: "#006064", bgcolor: "#e0f7fa", px: 0.5, py: 0.2, borderRadius: 1, mr: 0.5 }}>
                          {attr.value}
                        </Typography>
                      ))}
                      <Typography
                        sx={{ color: "#f28900", fontWeight: 700, mt: 0.5 }}
                      >
                        {formatMoney(item.unitPrice)}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingId === item.id}
                      sx={{ color: "#ccc", alignSelf: "flex-start", p: 0.5 }}
                      size="small"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Mobile: quantity + subtotal */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 1.5,
                      pl: "106px",
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1 || updatingId === item.id}
                        sx={{ borderRadius: 0, width: 32, height: 32 }}
                      >
                        <RemoveIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        sx={{
                          width: 36,
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                        }}
                      >
                        {updatingId === item.id ? "..." : item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity + 1)
                        }
                        disabled={updatingId === item.id}
                        sx={{ borderRadius: 0, width: 32, height: 32 }}
                      >
                        <AddIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                    <Typography sx={{ fontWeight: 700, color: "#333" }}>
                      {formatMoney(item.unitPrice * item.quantity)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Tiếp tục mua sắm */}
          <Box sx={{ mt: 2 }}>
            <Button
              component={Link}
              to="/shop"
              sx={{
                color: "#f28900",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: "#fff8ef" },
              }}
            >
              ← Tiếp tục mua sắm
            </Button>
          </Box>
        </Box>

        {/* ═══ CỘT PHẢI: Tóm tắt đơn hàng ═══ */}
        <Box
          sx={{
            width: { xs: "100%", lg: 380 },
            flexShrink: 0,
            position: { lg: "sticky" },
            top: { lg: 20 },
          }}
        >
          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: 3,
              border: "1px solid #eee",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 2.5,
                bgcolor: "#fafafa",
                borderBottom: "1px solid #eee",
              }}
            >
              <Typography
                sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#333" }}
              >
                Tóm tắt đơn hàng
              </Typography>
            </Box>

            {/* Body */}
            <Box sx={{ p: 2.5 }}>
              {/* Item summary */}
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {cartItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#666",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.variant?.product?.name || "Sản phẩm"}{" "}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ color: "#999" }}
                      >
                        x{item.quantity}
                      </Typography>
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "#333",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMoney(item.unitPrice * item.quantity)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Price breakdown */}
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "#888" }}>
                    Tạm tính
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#333" }}
                  >
                    {formatMoney(subtotal)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "#888" }}>
                    Phí vận chuyển
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: freeShipping ? "#2e7d32" : "#333",
                    }}
                  >
                    {freeShipping ? "Miễn phí" : formatMoney(shipping)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Total */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2.5,
                }}
              >
                <Typography
                  sx={{ fontWeight: 700, fontSize: "1rem", color: "#333" }}
                >
                  Tổng cộng
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "1.3rem",
                    color: "#f28900",
                  }}
                >
                  {formatMoney(total)}
                </Typography>
              </Box>

              {/* Checkout button */}
              <Button
                variant="contained"
                fullWidth
                size="large"
                component={Link}
                to="/checkout"
                sx={{
                  bgcolor: "#f28900",
                  "&:hover": {
                    bgcolor: "#e67c00",
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(242,137,0,0.35)",
                  },
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 2,
                  transition: "all 0.2s ease",
                }}
              >
                Tiến hành thanh toán
              </Button>

              {/* Security badge */}
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "#bbb" }}>
                  🔒 Thanh toán an toàn & bảo mật
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default ShoppingCart;
