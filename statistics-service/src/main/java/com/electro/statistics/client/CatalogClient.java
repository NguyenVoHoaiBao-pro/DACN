package com.electro.statistics.client;

import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "catalog-service", path = "/api/products/internal")
public interface CatalogClient {

    // Truy vấn Tên thật của Sản phẩm dựa vào ID.
    // Mục đích: Làm giàu dữ liệu (Data Enrichment) cho tính năng AI Gợi ý hoặc Báo cáo Tỉ lệ chuyển đổi.
    @GetMapping("/{productId}")
    ProductResponse getProductById(@PathVariable Integer productId);

    // Yêu cầu Catalog Service lọc ra những mặt hàng nào đang Sắp Hết Tồn Kho.
    // Mục đích: Cung cấp Bảng cảnh báo Đỏ trên Admin Dashboard để chủ Shop kịp thời nhập thêm hàng.
    @GetMapping("/low-stock")
    List<LowStockVariant> getLowStockVariants();

    @Data
    class ProductResponse {
        private Integer id;
        private String name;
    }

    @Data
    class LowStockVariant {
        private Integer productId;
        private String productName;
        private Integer variantId;
        private String variantName;
        private Integer stockQuantity;
        private Integer lowStockThreshold;
    }
}
