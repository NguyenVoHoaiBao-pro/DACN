import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import ProductCard from "../ProductCard/ProductCard";
import { selectUser } from "../../redux/appSlice";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import httpClient from "../../services/httpClient";
import { API_PREFIX } from "../../config/api";
import { unwrapPageContent } from "../../utils/apiResponse";
import { mapProductForCard } from "../../utils/productMapper";
import { getBestSellers, getProductDetail } from "../../services/productService";

const AIRecommendation = () => {
  const [products, setProducts] = useState([]);
  const user = useSelector(selectUser);
  const currentUserId = user?.id || 9003;

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        let rawProducts = [];

        try {
          const response = await httpClient.get(
            `${API_PREFIX}/recommendations/user/${currentUserId}`,
          );
          rawProducts = response.data?.data || [];
        } catch (err) {
          console.warn("Recommendations API unavailable:", err.message);
        }

        if (rawProducts.length > 0 && !rawProducts[0].price && !rawProducts[0].images) {
          const enriched = await Promise.all(
            rawProducts.map(async (item) => {
              try {
                return await getProductDetail(item.id);
              } catch {
                return item;
              }
            }),
          );
          rawProducts = enriched.filter(Boolean);
        }

        if (rawProducts.length === 0) {
          const bestRes = await getBestSellers(0, 8);
          rawProducts = unwrapPageContent(bestRes);
        }

        setProducts(rawProducts.map(mapProductForCard));
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      }
    };

    fetchRecommendations();
  }, [currentUserId]);

  if (products.length === 0) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        width: "100%",
        px: { xs: 2, md: 3 },
        py: 4,
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
        borderRadius: "16px",
        my: 4,
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          px: { xs: 1, md: 0 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AutoAwesomeIcon
            sx={{
              color: "#2196f3",
              fontSize: 32,
              animation: "spin 3s linear infinite",
              "@keyframes spin": { "100%": { transform: "rotate(360deg)" } },
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(90deg, #2196f3, #00bcd4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textTransform: "uppercase",
              letterSpacing: "1px",
              display: "inline-block",
            }}
          >
            Gợi ý dành cho Bạn
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: "#666", display: { xs: "none", sm: "block" }, fontStyle: "italic" }}
        >
          {user ? "Được cá nhân hóa bởi hệ thống gợi ý" : "Gợi ý từ hệ thống (đăng nhập để cá nhân hóa hơn)"}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 2,
        }}
      >
        {products.map((p) => (
          <Box
            key={p.id}
            sx={{
              display: "flex",
              width: "100%",
              transition: "transform 0.3s",
              "&:hover": { transform: "translateY(-8px)" },
            }}
          >
            <ProductCard product={p} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AIRecommendation;
