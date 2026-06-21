import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import {
  Box,
  Breadcrumbs,
  Button,
  Grid,
  IconButton,
  Link as MLink,
  Paper,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  addToWishlist,
  removeFromWishlist,
  selectIsLoggedIn,
  selectUser,
  selectWishlist,
  setCart,
} from "../../redux/appSlice";
import { addItemToCart } from "../../services/cartService";
import { getProductDetail } from "../../services/productService";
import { trackInteraction } from "../../utils/analytics";
import ReviewList from "../Review/ReviewList";
import ProductSimilarRecommendations from "./ProductSimilarRecommendations";

const DUMMY = {
  title: "Sản phẩm",
  description: "Đang tải thông tin sản phẩm...",
  price: 0,
  rating: 0,
  reviews: 0,
  images: ["https://placehold.co/800x504?text=Loading..."],
};

// Determine variant section label based on variant values
function getVariantLabel(variantNames) {
  if (!variantNames || variantNames.length === 0) return "PHIÊN BẢN:";
  const allSizes = variantNames.every((n) => /^\d+(GB|TB)$/i.test(n));
  if (allSizes) {
    const hasLarge = variantNames.some(
      (n) => parseInt(n) >= 128 || /TB/i.test(n),
    );
    return hasLarge ? "DUNG LƯỢNG BỘ NHỚ:" : "RAM:";
  }
  return "PHIÊN BẢN:";
}

function extractImages(data, currentVariantId) {
  let rawImages = [];
  if (data.images && Array.isArray(data.images)) {
    rawImages = data.images;
  } else if (data.originalData?.images && Array.isArray(data.originalData.images)) {
    rawImages = data.originalData.images;
  }

  if (rawImages.length === 0) return ["https://placehold.co/800x504?text=No+Image"];

  const fallbackImages = rawImages.filter(img => img.variantId === null || img.variantId === undefined);
  const variantImages = currentVariantId
    ? rawImages.filter(img => img.variantId === currentVariantId)
    : [];

  // ROLLBACK VỀ KHUYẾN NGHỊ BÁM SÁT THIẾT KẾ CƠ SỞ DỮ LIỆU
  // Thuật toán: "NẾU CÓ ẢNH RIÊNG THÌ LẤY ẢNH RIÊNG, NẾU KHÔNG CÓ THÌ MƯỢN TẠM ẢNH GỐC"
  const displayImagesArray = variantImages.length > 0 ? variantImages : fallbackImages;

  const finalLinks = displayImagesArray.map(img => img.linkImage || img.image_url || img).filter(Boolean);

  return finalLinks.length > 0 ? finalLinks : ["https://placehold.co/800x504?text=No+Image"];
}

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const wishlist = useSelector(selectWishlist);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const currentUser = useSelector(selectUser);
  const isInWishlist = wishlist.some((item) => String(item.id) === String(id));

  const [apiProduct, setApiProduct] = useState(null);

  // Luôn fetch từ API để lấy đầy đủ thông tin (bao gồm variants)
  useEffect(() => {
    if (id) {
      getProductDetail(id)
        .then((data) => {
          if (data) setApiProduct(data);
        })
        .catch((err) => console.error("Failed to fetch product:", err));
    
    // 🧠 AI Tracking: Ghi lại VIEW (1.0 điểm)
    if (id) {
      trackInteraction({
        userId: currentUser?.id || null, // Xử lý khách vãng lai (null)
        productId: Number(id),
        actionType: 'VIEW'
      });
    }
    }
  }, [id]);

  const product = useMemo(() => {
    const stateProduct = location.state?.product;
    // Ưu tiên apiProduct vì nó có đầy đủ variants và options
    const source = apiProduct || stateProduct;

    if (!source) {
      return {
        id,
        ...DUMMY,
        variants: [],
        options: [],
        hasRealVariants: false,
        defaultVariant: null,
      };
    }

    // Trích xuất variants từ API response
    const variants = source.variants || [];

    // Trích xuất options từ API (mảng dùng để vẽ Nút bấm UI)
    const options = source.options || [];

    // Kiểm tra có biến thể thực sự không
    const hasRealVariants = variants.length > 0;

    // Tìm variant mặc định khởi tạo ban đầu, ưu tiên isDefault = true
    const defaultVariant =
      variants.find((v) => v.isDefault) || variants[0] || null;

    const mapped = {
      title: source.name || DUMMY.title,
      description: source.description || source.detail || DUMMY.description,
      price: typeof source.price === "number" ? source.price : DUMMY.price,
      rating: source.averageRating || DUMMY.rating,
      reviews: source.reviewCount || DUMMY.reviews,
      variants,
      options,
      hasRealVariants,
      defaultVariant,
      rawImages: source.images || [], // Trữ lại mảng ảnh gốc để component lọc sau này
      productType: source.productType || source.originalData?.productType,
      producer: source.producer || source.originalData?.producer,
    };
    return { id, sourceData: source, ...mapped };
  }, [id, location.state, apiProduct]);

  const [active, setActive] = useState(0);
  const [currentVariant, setCurrentVariant] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [ratingValue, setRatingValue] = useState(0);

  // Mảng ảnh được tính toán lại mỗi khi currentVariant thay đổi HOẶC API load xong
  const displayImages = useMemo(() => {
    // GIẢI PHÁP 1: FIX ROUTER CACHE (BÓNG MA DỮ LIỆU CŨ)
    // Phải chờ API trả về thật thì mới xử lý ảnh. Nếu chưa có API, dùng Placeholder
    if (!apiProduct) {
      return ["https://placehold.co/800x504?text=Dang+Tai+Anh..."];
    }
    const urls = extractImages(apiProduct, currentVariant?.id);
    // Reset lại index gallery khi chuyển đổi variant có ảnh mới
    setActive(0);
    return urls;
  }, [apiProduct, currentVariant]);

  // Khởi tạo selectedOptions từ defaultVariant khi tải xong sản phẩm
  useEffect(() => {
    if (product.defaultVariant) {
      setCurrentVariant(product.defaultVariant);
      if (Array.isArray(product.defaultVariant.attributeValues)) {
        const initialOpts = {};
        product.defaultVariant.attributeValues.forEach(attr => {
          initialOpts[attr.attributeName || attr.name] = attr.value;
        });
        setSelectedOptions(initialOpts);
      }
    }
  }, [product.defaultVariant]);

  // Xử lý khi click chọn 1 thuộc tính trên giao diện GUI
  const handleOptionSelect = (optionName, optionValue) => {
    const newSelectedOptions = { ...selectedOptions, [optionName]: optionValue };
    setSelectedOptions(newSelectedOptions);

    // Thuật toán Guideline: Mò vô giỏ variants lôi ra thằng Biến thể khớp hoàn toàn
    const exactVariant = product.variants.find(v => {
      if (!v.attributeValues || v.attributeValues.length === 0) return false;
      return Object.keys(newSelectedOptions).every(key => {
        const selectedVal = newSelectedOptions[key];
        return v.attributeValues.some(
          attr => (attr.attributeName === key || attr.name === key) && attr.value === selectedVal
        );
      });
    });

    if (exactVariant) {
      setCurrentVariant(exactVariant); // Set cứng nếu match 100%
    }
  };

  // Helper function để check Disabled (chặn click nút Hết hàng) theo Guideline
  // Check xem nếu Khách ấn vào giá trị `value` cho `optionName` này với các cấu hình Đang có, thì có bị Out of Stock k?
  const isOptionDisabled = (optionName, optionValue) => {
    // Thử ghép cặp option chuẩn bị click này với các selectedOptions hiện tại
    const simulatedOptions = { ...selectedOptions, [optionName]: optionValue };

    // Tìm Variant tương ứng cho simulated object này
    const targetVariant = product.variants.find(v => {
      if (!Array.isArray(v.attributeValues)) return false;
      return Object.keys(simulatedOptions).every(key => {
        const val = simulatedOptions[key];
        return v.attributeValues.some(
          attr => (attr.attributeName === key || attr.name === key) && attr.value === val
        );
      });
    });

    // Nếu tìm ra Variant nhưng nó bị set isActive === false HOẶC stockQuantity === 0 => Disable!
    if (targetVariant) {
      if (targetVariant.isActive === false || targetVariant.stockQuantity === 0) {
        return true;
      }
    } else {
      // Nếu Variant hoàn toàn không tồn tại với tổ hợp cấu hình này, cũng nên Disable
      return true;
    }
    return false;
  };

  // Giá hiển thị dựa trên variant đang chọn
  const displayPrice = currentVariant?.price || product.price;
  const originalPrice = currentVariant?.originalPrice || null;

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3, maxWidth: 1400, mx: "auto" }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MLink color="inherit" href="/">
          Home
        </MLink>
        <MLink color="inherit" href="/shop">
          Shop
        </MLink>
        <Typography color="text.primary">Product Detail</Typography>
      </Breadcrumbs>

      {/* Main flexbox container */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
          mb: 4,
        }}
      >
        {/* Cột 1: Image Gallery - 35% */}
        <Box sx={{ flex: { xs: "1", md: "0 0 35%" } }}>
          <Box sx={{ background: "#eee", p: 2, borderRadius: 2 }}>
            <Box sx={{ overflow: "hidden", borderRadius: 1, mb: 2 }}>
              <img
                src={displayImages[active]}
                alt="preview"
                style={{
                  width: "100%",
                  height: "400px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
              {displayImages.map((src, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    outline:
                      i === active
                        ? "3px solid #ff9f1a"
                        : "1px solid #ddd",
                  }}
                  onClick={() => setActive(i)}
                >
                  <img
                    src={src}
                    alt={`thumb-${i}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Cột 2: Product Info - 65% */}
        <Box sx={{ flex: { xs: "1", md: "0 0 65%" } }}>
          <Box sx={{ pl: { md: 2 } }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {product.title}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}>
              <Rating value={product.rating} precision={0.5} readOnly />
              <Typography variant="body2" sx={{ color: "#666" }}>
                {product.reviews} reviews
              </Typography>
            </Box>
            {product.description && (
              <Box
                sx={{ color: "#555", mb: 2, "& p": { my: 1 }, "& ul": { pl: 3 }, "& li": { mb: 0.5 } }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
            {/* Giá sản phẩm - dựa trên variant đang chọn */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ textTransform: "uppercase", fontWeight: 700 }}
              >
                Giá sản phẩm:{" "}
                <Box component="span" sx={{ color: "#ff9f1a" }}>
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(displayPrice)}
                </Box>
              </Typography>
              {originalPrice && originalPrice > displayPrice && (
                <Typography
                  variant="body2"
                  sx={{
                    textDecoration: "line-through",
                    color: "#999",
                    mt: 0.5,
                  }}
                >
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(originalPrice)}
                </Typography>
              )}
            </Box>

            {/* GUI Render Bấm Nút Lựa Chọn Cấu Hình Từ API Options */}
            {product.options && product.options.length > 0 && (
              <Box sx={{ my: 4 }}>
                {product.options.map((optGroup) => (
                  <Box key={optGroup.name} sx={{ mb: 4 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 2, color: "#333", textTransform: "uppercase" }}
                    >
                      {optGroup.name}:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      {optGroup.values.map((val) => {
                        const isSelected = selectedOptions[optGroup.name] === val;
                        const disabled = isOptionDisabled(optGroup.name, val);

                        return (
                          <Paper
                            key={val}
                            elevation={isSelected ? 6 : 1}
                            onClick={() => {
                              if (!disabled) handleOptionSelect(optGroup.name, val);
                            }}
                            sx={{
                              px: 3,
                              py: 1.2,
                              borderRadius: 2,
                              cursor: disabled ? "not-allowed" : "pointer",
                              border: isSelected
                                ? "2px solid #ff9f1a"
                                : disabled ? "1px dashed #bdbdbd" : "1px solid #e0e0e0",
                              background: disabled
                                ? "#f5f5f5"
                                : isSelected
                                  ? "linear-gradient(135deg, #fff3e0, #fff8f0)"
                                  : "#ffffff",
                              opacity: disabled ? 0.6 : 1,
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              position: "relative",
                              overflow: "hidden",
                              "&:hover": {
                                borderColor: disabled ? "#bdbdbd" : "#ff9f1a",
                                transform: disabled ? "none" : "translateY(-2px)",
                                boxShadow: disabled ? "none" : "0 4px 12px rgba(255,159,26,0.15)",
                              },
                              ...(disabled && {
                                "&::after": {
                                  content: '""',
                                  position: 'absolute',
                                  top: '50%',
                                  left: 0,
                                  width: '100%',
                                  height: '1px',
                                  backgroundColor: '#9e9e9e',
                                  transform: 'rotate(-15deg)',
                                }
                              })
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isSelected ? 800 : 600,
                                color: disabled ? "#9e9e9e" : isSelected ? "#e65100" : "#424242",
                              }}
                            >
                              {val}
                            </Typography>
                            {/* Chữ in đè khi hết hàng */}
                            {disabled && (
                              <Typography variant="caption" sx={{ ml: 1, color: '#e53935', fontSize: '10px', fontWeight: 'bold' }}>
                                Hết hàng
                              </Typography>
                            )}
                          </Paper>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1.5, mt: 4 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={async () => {
                  if (!isLoggedIn) {
                    alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
                    navigate("/login");
                    return;
                  }
                  if (!currentVariant?.id) {
                    alert("Phiên bản bạn đang chọn không khả dụng, vui lòng chọn lại!");
                    return;
                  }
                  if (currentVariant.stockQuantity === 0) {
                    alert("Sản phẩm tạm thời hết hàng, vui lòng thử lại sau!");
                    return;
                  }
                  try {
                    // Truyền chuẩn productId và variantId
                    const cart = await addItemToCart(currentVariant.id, 1);
                    dispatch(setCart(cart.items || []));
                    // 🧠 AI Tracking: Ghi lại ADD_TO_CART (3.0 điểm)
                    trackInteraction({
                      userId: currentUser?.id || null,
                      productId: Number(id),
                      actionType: 'ADD_TO_CART'
                    });
                    alert("Đã thêm " + product.title + " vào giỏ hàng!");
                  } catch (err) {
                    console.error("Add to cart failed:", err);
                    alert(
                      err.response?.data?.message ||
                      "Không thể thêm vào giỏ hàng",
                    );
                  }
                }}
              >
                Thêm vào giỏ
              </Button>
              <IconButton
                sx={{
                  color: isInWishlist ? "#e53935" : "#666",
                  border: isInWishlist
                    ? "2px solid #e53935"
                    : "2px solid #e0e0e0",
                  borderRadius: 2,
                  p: 1,
                  "&:hover": {
                    bgcolor: isInWishlist ? "#ffebee" : "#f5f5f5",
                  },
                }}
                onClick={() => {
                  if (isInWishlist) {
                    dispatch(removeFromWishlist(product.id));
                  } else {
                    dispatch(
                      addToWishlist({
                        id: product.id,
                        name: product.title,
                        price: displayPrice,
                        image: product.images[0],
                        category: product.productType?.name,
                      }),
                    );
                  }
                }}
              >
                {isInWishlist ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <ProductSimilarRecommendations productId={Number(id)} />

      {/* Dynamic Product Review Section */}
      <ReviewList productId={id} />
    </Box>
  );
}
