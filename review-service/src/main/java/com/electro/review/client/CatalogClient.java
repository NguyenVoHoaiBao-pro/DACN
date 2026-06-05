package com.electro.review.client;

import com.electro.review.dto.CatalogClientDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "catalog-service", path = "/api/products/internal")
public interface CatalogClient {

    // Xác minh sự tồn tại của Sản phẩm và Lấy Tên sản phẩm.
    // - Ý nghĩa 1: Chặn đứng các luồng request ảo đánh giá cho sản phẩm không tồn tại (Hack/Spam).
    // - Ý nghĩa 2: Lấy Tên sản phẩm đắp vào JSON trả về cho Frontend hiển thị (Data Enrichment).
    @GetMapping("/{productId}")
    CatalogClientDto.ProductResponse getProductById(@PathVariable("productId") Integer productId);

    // Xác minh Phân loại sản phẩm (VD: Màu Đỏ - 256GB).
    // Giúp người đọc review biết được khách hàng đó đang đánh giá cho phiên bản nào.
    @GetMapping("/variants/{variantId}")
    CatalogClientDto.VariantResponse getVariantById(@PathVariable("variantId") Integer variantId);
}
