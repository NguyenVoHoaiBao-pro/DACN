import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RefreshIcon from "@mui/icons-material/Refresh";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import {
  Box,
  Button,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../ProductCard/ProductCard";
import {
  fetchAllProductsPage,
  fetchBestSellersPage,
  fetchFeaturedPage,
  fetchNewProductsPage,
} from "../../hooks/useProductList";
import { getApiErrorMessage, isAbortError, unwrapPageContent } from "../../utils/apiResponse";
import { mapProductForCard } from "../../utils/productMapper";

const TABS_CONFIG = [
  { label: "Nổi Bật", fetch: () => fetchFeaturedPage(0, 8), path: "/shop?type=featured" },
  { label: "Hàng Mới", fetch: fetchNewProductsPage, path: "/shop?sort_by=importdate&sort_dir=desc" },
  { label: "Bán Chạy", fetch: () => fetchBestSellersPage(0, 8), path: "/shop?type=best-sellers" },
  { label: "Tất Cả", fetch: () => fetchAllProductsPage(0, 10), path: "/shop" },
];

const ProductSkeleton = () => (
  <Box
    sx={{
      p: 1.5,
      border: "1px solid #eee",
      borderRadius: 2,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      width: "100%",
    }}
  >
    <Skeleton variant="rectangular" height={220} sx={{ borderRadius: "8px" }} />
    <Box sx={{ mt: 2, px: 0.5, flexGrow: 1, display: "flex", flexDirection: "column" }}>
      <Skeleton variant="text" width="100%" height={24} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="45%" height={28} />
    </Box>
  </Box>
);

const OurProducts = () => {
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadTab = useCallback(async (tabIndex, signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await TABS_CONFIG[tabIndex].fetch();
      if (signal?.aborted) return;
      const content = unwrapPageContent(result);
      setProducts(content.map(mapProductForCard));
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      console.error("Failed to fetch products:", err);
      setProducts([]);
      setError(getApiErrorMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTab(tab, controller.signal);
    return () => controller.abort();
  }, [tab, loadTab]);

  const handleRetry = () => {
    const controller = new AbortController();
    loadTab(tab, controller.signal);
  };

  const handleSeeAll = () => {
    navigate(TABS_CONFIG[tab].path);
  };

  return (
    <Box component="section" sx={{ width: "100%", px: { xs: 2, md: 3 }, py: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          gap: 2,
          px: { xs: 1, md: 0 },
          flexWrap: { xs: "wrap", md: "nowrap" },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: "#f28900",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            position: "relative",
            display: "inline-block",
            pb: "10px",
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "3px",
              background: "linear-gradient(90deg, #f28900, #ffb347)",
              borderRadius: "2px",
            },
          }}
        >
          Sản Phẩm Của Chúng Tôi
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              textTransform: "none",
              minHeight: 44,
              fontWeight: 600,
              color: "#64748b",
              borderRadius: "8px",
              mx: 0.5,
            },
            "& .Mui-selected": {
              bgcolor: "#f28900",
              color: "#fff !important",
              fontWeight: 700,
            },
            "& .MuiTabs-indicator": { display: "none" },
          }}
        >
          {TABS_CONFIG.map((config, index) => (
            <Tab key={index} label={config.label} />
          ))}
        </Tabs>
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
          gap: 2.5,
        }}
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Box key={index} sx={{ display: "flex", width: "100%" }}>
              <ProductSkeleton />
            </Box>
          ))
        ) : error ? (
          <Box
            sx={{
              gridColumn: "1 / -1",
              textAlign: "center",
              py: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <SentimentDissatisfiedIcon sx={{ fontSize: 56, color: "#e74c3c" }} />
            <Typography color="error" fontWeight={600}>
              {error}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ borderColor: "#f28900", color: "#f28900" }}
            >
              Thử lại
            </Button>
          </Box>
        ) : products.length > 0 ? (
          products.map((p) => (
            <Box key={p.id} sx={{ display: "flex", width: "100%" }}>
              <ProductCard product={p} />
            </Box>
          ))
        ) : (
          <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 8 }}>
            <SentimentDissatisfiedIcon sx={{ fontSize: 60, color: "#94a3b8" }} />
            <Typography variant="h6" color="#475569" fontWeight={600}>
              Chưa cập nhật sản phẩm nào
            </Typography>
          </Box>
        )}
      </Box>

      {!loading && !error && products.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4.5 }}>
          <Button
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
            onClick={handleSeeAll}
            sx={{
              borderRadius: "24px",
              textTransform: "none",
              px: 4,
              fontWeight: 700,
              borderColor: "#f28900",
              color: "#f28900",
              borderWidth: "2px",
              "&:hover": { bgcolor: "#fff7ed", borderWidth: "2px" },
            }}
          >
            Xem tất cả {TABS_CONFIG[tab].label}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default OurProducts;
