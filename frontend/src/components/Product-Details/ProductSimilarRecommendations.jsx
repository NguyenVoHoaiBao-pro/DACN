import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Box, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { API_PREFIX } from "../../config/api";
import { selectIsLoggedIn, selectUser } from "../../redux/appSlice";
import httpClient from "../../services/httpClient";
import { getProductDetail } from "../../services/productService";
import { mapProductForCard } from "../../utils/productMapper";
import ProductCard from "../ProductCard/ProductCard";

const MAX_DISPLAY = 10;

export default function ProductSimilarRecommendations({ productId }) {
  const [products, setProducts] = useState([]);
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  useEffect(() => {
    if (!productId) return;

    const fetchSimilar = async () => {
      try {
        let url = `${API_PREFIX}/recommendations/similar/${productId}`;
        if (isLoggedIn && user?.id) {
          url = `${API_PREFIX}/recommendations/hybrid/${user.id}/${productId}`;
        }

        const response = await httpClient.get(url);
        const rawItems = response.data?.data || [];

        const enriched = await Promise.all(
          rawItems.map(async (item) => {
            try {
              return await getProductDetail(item.id);
            } catch {
              return { id: item.id, name: item.name };
            }
          }),
        );

        setProducts(enriched.filter(Boolean).map(mapProductForCard));
      } catch (err) {
        console.warn("Similar/Hybrid recommendations unavailable:", err.message);
        setProducts([]);
      }
    };

    fetchSimilar();
  }, [productId, isLoggedIn, user?.id]);

  const displayProducts = useMemo(
    () => products.slice(0, MAX_DISPLAY),
    [products],
  );

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        mt: 4,
        px: { xs: 1.5, md: 2 },
        py: { xs: 2.5, md: 3 },
        background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: { xs: 2, md: 2.5 },
          px: { xs: 0.5, md: 0 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <AutoAwesomeIcon sx={{ color: "#1976d2", fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "#1e293b",
              letterSpacing: "0.2px",
            }}
          >
            Có thể bạn quan tâm
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            display: { xs: "none", sm: "block" },
            fontStyle: "italic",
          }}
        >
          Gợi ý dựa trên sản phẩm bạn đang xem
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
          alignItems: "stretch",
          width: "100%",
        }}
      >
        {displayProducts.map((p) => (
          <Box
            key={p.id}
            sx={{
              display: "flex",
              width: "100%",
              minWidth: 0,
            }}
          >
            <ProductCard product={p} compact />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
