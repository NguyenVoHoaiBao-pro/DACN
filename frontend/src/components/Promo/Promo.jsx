import {
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  Grid,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetPostsQuery } from "../../redux/apiSlice";
import { addToCart, selectCartItemCount } from "../../redux/appSlice";

const featureItems = [
  {
    title: "MIỄN PHÍ TRẢ HÀNG",
    desc: "Đổi trả trong vòng 30 ngày",
    icon: "https://res.cloudinary.com/dhhvmdtcz/image/upload/customer-benefits/free_return.png",
    color: "#10b981",
  },
  {
    title: "GIAO HÀNG MIỄN PHÍ",
    desc: "Đơn hàng trên 500.000đ",
    icon: "https://res.cloudinary.com/dhhvmdtcz/image/upload/customer-benefits/free_shipping.png",
    color: "#3b82f6",
  },
  {
    title: "HỖ TRỢ 24/7",
    desc: "Tư vấn khách hàng mọi lúc",
    icon: "https://res.cloudinary.com/dhhvmdtcz/image/upload/customer-benefits/support.png",
    color: "#8b5cf6",
  },
  {
    title: "THẺ QUÀ TẶNG",
    desc: "Nhận quà với đơn hàng 1tr+",
    icon: "https://res.cloudinary.com/dhhvmdtcz/image/upload/customer-benefits/gift_card.png",
    color: "#f59e0b",
  },
  {
    title: "THANH TOÁN AN TOÀN",
    desc: "Bảo mật thông tin tuyệt đối",
    icon: "https://res.cloudinary.com/dhhvmdtcz/image/upload/customer-benefits/secure_payment.png",
    color: "#ef4444",
  },
  {
    title: "BẢO HÀNH CHÍNH HÃNG",
    desc: "Bảo hành toàn quốc 12 tháng",
    icon: "https://res.cloudinary.com/dhhvmdtcz/image/upload/customer-benefits/warranty.png",
    color: "#06b6d4",
  },
];

const Promo = () => {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartItemCount);

  // Use RTK Query as demo data source for promo titles/subtitles
  const { data: posts = [], isFetching } = useGetPostsQuery();

  const promoCards = useMemo(
    () => [
      {
        id: 101,
        title: "iPhone 15\nPro Max",
        subtitle: "29.990.000đ",
        image: "https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/iphone-15-pro-max_3.png",
        overlay: "linear-gradient(to right, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.4) 100%)",
        titleColor: "#f28900",
        subtitleColor: "#888",
        btnText: "Mua Ngay",
        btnBg: "#f28900",
        layout: "flex-start",
        alignText: "left",
        bgPos: "right center",
      },
      {
        id: 102,
        title: "SALE",
        subtitle: "Giảm Đến 50%",
        image: "https://mac365.vn/wp-content/uploads/2024/03/3-12.png",
        overlay: "rgba(245, 190, 105, 0.85)", // Orange-yellowish tint
        titleColor: "#e63946",
        subtitleColor: "#fff",
        btnText: "Mua Ngay",
        btnBg: "#e63946",
        layout: "center",
        alignText: "center",
        bgPos: "center",
      },
    ],
    []
  );

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      <Box
        component="section"
        sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}
      >
        {/* Row 1: six feature boxes */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(6, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {featureItems.map((f, idx) => (
            <Card
              key={idx}
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: { xs: 1, lg: 1.5 },
                p: { xs: 1.5, lg: 2 },
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                border: "1px solid #f0f0f0",
                borderRadius: 3,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
                  borderColor: f.color,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  mr: 1, // Add slight right margin spacing
                }}
              >
                <Box
                  component="img"
                  src={f.icon}
                  alt={f.title}
                  sx={{
                    width: { xs: 45, md: 55 },
                    height: { xs: 45, md: 55 },
                    objectFit: "contain",
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 0,
                    color: "#333",
                    fontSize: { xs: "0.75rem", lg: "0.8rem" },
                    mb: 0.5,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={f.title}
                >
                  {f.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#666",
                    fontSize: { xs: "0.65rem", lg: "0.75rem" },
                    lineHeight: 1.3,
                  }}
                >
                  {f.desc}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>

        {/* Row 2: two promo cards (same row, equal width) */}
        <Grid
          container
          spacing={2}
          alignItems="stretch"
          sx={{ flexWrap: "nowrap" }}
        >
          {promoCards.map((p) => (
            <Grid
              key={p.id}
              item
              xs={6}
              md={6}
              sx={{ display: "flex", flexDirection: "column", flex: "1 1 50%" }}
            >
              <Card
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 2,
                  border: "1px solid #eee",
                  flexGrow: 1,
                  minHeight: 250,
                  cursor: "pointer",
                  transition: "all 0.4s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
                    "& .bg-image": {
                      transform: "scale(1.05)",
                    }
                  },
                }}
              >
                {/* Background Image Layer */}
                <Box
                  className="bg-image"
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: p.bgPos,
                    zIndex: 0,
                    transition: "transform 0.6s ease",
                  }}
                />

                {/* Overlay Layer */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: p.overlay,
                    zIndex: 1,
                  }}
                />

                {/* Content Layer */}
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: p.layout,
                    justifyContent: "center",
                    textAlign: p.alignText,
                    height: "100%",
                    px: { xs: 3, md: 5 },
                    py: 4,
                  }}
                >
                  <Typography
                    sx={{
                      color: p.titleColor,
                      fontSize: { xs: "2rem", md: "2.5rem" },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      whiteSpace: "pre-line",
                      mb: 1,
                      textShadow: "0 1px 2px rgba(255,255,255,0.5)",
                    }}
                  >
                    {p.title}
                  </Typography>

                  <Typography
                    sx={{
                      color: p.subtitleColor,
                      fontSize: { xs: "1.1rem", md: "1.3rem" },
                      fontWeight: p.layout === "center" ? 700 : 500,
                      mb: 3,
                    }}
                  >
                    {p.subtitle}
                  </Typography>

                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: p.btnBg,
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      px: 3,
                      py: 1,
                      borderRadius: 20, // Pill shape
                      textTransform: "none",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                      "&:hover": {
                        bgcolor: p.btnBg, // Keep same color just adjust shadow
                        boxShadow: "0 6px 15px rgba(0,0,0,0.25)",
                        filter: "brightness(0.9)",
                      },
                    }}
                    onClick={() =>
                      dispatch(
                        addToCart({
                          id: p.id,
                          name: p.title.replace("\n", " "),
                          price: parseInt(p.subtitle.replace(/\D/g, "")) || 48990000,
                        })
                      )
                    }
                  >
                    {p.btnText}
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid >
      </Box >
    </>
  );
};

export default Promo;
