package com.electro.catalog.controller;

import com.electro.catalog.entity.Product;
import com.electro.catalog.entity.ProductVariant;
import com.electro.catalog.repository.ProductRepository;
import com.electro.catalog.repository.ProductVariantRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products/internal")
public class InternalProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    @GetMapping("/{productId}")
    public ProductResponse getProductById(@PathVariable("productId") Integer productId) {
        Product product = productRepository.findById(productId).orElseThrow();
        ProductResponse res = new ProductResponse();
        res.setId(product.getId());
        res.setName(product.getName());
        res.setIsActive(product.getIsActive());
        res.setRequiresImei(product.getRequiresImei());
        return res;
    }

    @GetMapping("/variants/{variantId}")
    public VariantResponse getVariantById(@PathVariable("variantId") Integer variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId).orElseThrow();
        VariantResponse res = new VariantResponse();
        res.setId(variant.getId());
        res.setSkuCode(variant.getSkuCode());
        res.setVariantName(variant.getVariantName());
        res.setPrice(variant.getPrice());
        res.setStockQuantity(variant.getStockQuantity());
        res.setIsActive(variant.getIsActive());

        if (variant.getProduct() != null) {
            ProductResponse pRes = new ProductResponse();
            pRes.setId(variant.getProduct().getId());
            pRes.setName(variant.getProduct().getName());
            pRes.setIsActive(variant.getProduct().getIsActive());
            pRes.setRequiresImei(variant.getProduct().getRequiresImei());
            res.setProduct(pRes);
        }

        String imageUrl = null;
        if (variant.getImages() != null && !variant.getImages().isEmpty()) {
            imageUrl = serverUrl + "/img/" + variant.getImages().get(0).getId();
        } else if (variant.getProduct() != null
                && variant.getProduct().getImages() != null
                && !variant.getProduct().getImages().isEmpty()) {
            imageUrl = serverUrl + "/img/" + variant.getProduct().getImages().get(0).getId();
        }
        res.setImageUrl(imageUrl);

        return res;
    }

    @GetMapping("/low-stock")
    public List<LowStockVariantResponse> getLowStockVariants() {
        return productVariantRepository.findLowStockVariants().stream().map(v -> {
            LowStockVariantResponse res = new LowStockVariantResponse();
            res.setVariantId(v.getId());
            res.setVariantName(v.getVariantName());
            res.setStockQuantity(v.getStockQuantity());
            res.setLowStockThreshold(v.getLowStockThreshold());
            if (v.getProduct() != null) {
                res.setProductId(v.getProduct().getId());
                res.setProductName(v.getProduct().getName());
            }
            return res;
        }).toList();
    }

    @Data
    public static class LowStockVariantResponse {
        private Integer productId;
        private String productName;
        private Integer variantId;
        private String variantName;
        private Integer stockQuantity;
        private Integer lowStockThreshold;
    }

    @org.springframework.web.bind.annotation.PutMapping("/variants/{variantId}/stock")
    public void updateStock(@PathVariable("variantId") Integer variantId, @org.springframework.web.bind.annotation.RequestParam("delta") Integer delta) {
        ProductVariant variant = productVariantRepository.findById(variantId).orElseThrow();
        if (variant.getStockQuantity() == null) {
            variant.setStockQuantity(0);
        }
        variant.setStockQuantity(variant.getStockQuantity() + delta);
        productVariantRepository.save(variant);
    }

    @Data
    public static class ProductResponse {
        private Integer id;
        private String name;
        private Boolean isActive;
        private Boolean requiresImei;
    }

    @Data
    public static class VariantResponse {
        private Integer id;
        private String skuCode;
        private String variantName;
        private BigDecimal price;
        private Integer stockQuantity;
        private Boolean isActive;
        private ProductResponse product;
        private String imageUrl;
    }
}
