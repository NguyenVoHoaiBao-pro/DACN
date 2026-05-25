import { Box, Button } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ProductCard from "../ProductCard/ProductCard";
import { fetchBestSellersPage, useProductList } from "../../hooks/useProductList";
import "./BestSellers.css";

const BestSellers = () => {
  const { products, loading, error, retry } = useProductList(
    () => fetchBestSellersPage(0, 8),
    [],
  );

  return (
    <section className="best-sellers" id="best-sellers">
      <div className="best-sellers__inner">
        <div className="best-sellers__header">
          <h2 className="best-sellers__title">Sản Phẩm Bán Chạy</h2>
          <p className="best-sellers__subtitle">
            Những sản phẩm được khách hàng tin tưởng và lựa chọn nhiều nhất tại
            Electro Store. Chất lượng đảm bảo, giá cả hợp lý.
          </p>
        </div>

        {loading && (
          <div className="best-sellers__loading">
            <div className="best-sellers__spinner" />
            <span className="best-sellers__loading-text">Đang tải sản phẩm bán chạy...</span>
          </div>
        )}

        {!loading && error && (
          <div className="best-sellers__error">
            <span className="best-sellers__error-icon">⚠️</span>
            <p className="best-sellers__error-text">{error}</p>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={retry}
              sx={{ mt: 1, borderColor: "#f28900", color: "#f28900" }}
            >
              Thử lại
            </Button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="best-sellers__empty">
            <span className="best-sellers__empty-icon">📦</span>
            <p className="best-sellers__empty-text">Chưa có sản phẩm bán chạy nào.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: 2,
              width: "100%",
            }}
          >
            {products.map((p) => (
              <Box key={p.id} sx={{ display: "flex", width: "100%" }}>
                <ProductCard product={p} />
              </Box>
            ))}
          </Box>
        )}
      </div>
    </section>
  );
};

export default BestSellers;
