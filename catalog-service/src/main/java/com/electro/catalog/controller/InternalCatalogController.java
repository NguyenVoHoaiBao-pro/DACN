package com.electro.catalog.controller;

import com.electro.catalog.dto.CartDto;
import com.electro.catalog.entity.ProductVariant;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.ProductVariantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/catalog")
public class InternalCatalogController {

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    @GetMapping("/variants/{variantId}/cart-info")
    public CartDto.CartVariantDto getVariantForCart(@PathVariable("variantId") Integer variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", variantId));

        CartDto.CartVariantDto vd = new CartDto.CartVariantDto();
        vd.setId(variant.getId());
        vd.setSkuCode(variant.getSkuCode());
        vd.setVariantName(variant.getVariantName());
        vd.setPrice(variant.getPrice() != null ? variant.getPrice().doubleValue() : null);
        vd.setOriginalPrice(variant.getOriginalPrice() != null ? variant.getOriginalPrice().doubleValue() : null);
        vd.setStockQuantity(variant.getStockQuantity());
        vd.setIsDefault(variant.getIsDefault());
        vd.setIsActive(variant.getIsActive()); // important for checking if variant is active!

        if (variant.getProduct() != null) {
            CartDto.CartProductDto pd = new CartDto.CartProductDto();
            pd.setId(variant.getProduct().getId());
            pd.setName(variant.getProduct().getName());
            vd.setProduct(pd);
        }

        String imageUrl = null;
        if (variant.getImages() != null && !variant.getImages().isEmpty()) {
            imageUrl = serverUrl + "/img/" + variant.getImages().get(0).getId();
        } else if (variant.getProduct() != null
                && variant.getProduct().getImages() != null
                && !variant.getProduct().getImages().isEmpty()) {
            imageUrl = serverUrl + "/img/" + variant.getProduct().getImages().get(0).getId();
        }
        vd.setImageUrl(imageUrl);

        return vd;
    }
}

