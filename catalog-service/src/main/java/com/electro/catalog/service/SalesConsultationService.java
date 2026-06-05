package com.electro.catalog.service;

import com.electro.catalog.dto.ProductDto;
import com.electro.catalog.dto.SalesConsultationDto;
import com.electro.catalog.entity.Product;
import com.electro.catalog.entity.ProductItem;
import com.electro.catalog.entity.ProductItemStatus;
import com.electro.catalog.entity.ProductVariant;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.ProductItemRepository;
import com.electro.catalog.repository.ProductRepository;
import com.electro.catalog.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalesConsultationService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductItemRepository productItemRepository;
    private final ProductService productService;

    public SalesConsultationDto.LookupResponse lookup(String keyword) {
        String q = keyword == null ? "" : keyword.trim();
        if (q.isEmpty()) {
            throw new BadRequestException("Vui lòng nhập tên sản phẩm, mã SKU hoặc IMEI/Serial");
        }

        Optional<ProductItem> byImei = productItemRepository.findDetailedByImeiOrSerial(q);
        if (byImei.isPresent()) {
            return buildImeiMatch(byImei.get(), q);
        }

        Optional<ProductVariant> exactSku = productVariantRepository.findBySkuCode(q);
        if (exactSku.isPresent()) {
            return buildSkuMatch(exactSku.get(), q, "SKU");
        }

        List<ProductVariant> skuHits = productVariantRepository.searchVariants(q);
        if (skuHits.size() == 1) {
            return buildSkuMatch(skuHits.get(0), q, "SKU");
        }
        if (skuHits.size() > 1) {
            return buildMultiSkuMatch(skuHits, q);
        }

        Page<Product> page = productRepository.adminSearchProducts(q, true, null, null, PageRequest.of(0, 20));
        if (page.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với từ khóa: " + q);
        }
        if (page.getNumberOfElements() == 1) {
            Product product = page.getContent().get(0);
            ProductDto.AdminProductResponse detail = productService.adminGetProductById(product.getId());
            return SalesConsultationDto.LookupResponse.builder()
                    .matchType("NAME")
                    .keyword(q)
                    .product(detail)
                    .build();
        }
        return buildNameListMatch(page.getContent(), q);
    }

    public ProductDto.AdminProductResponse getConsultationDetail(Integer productId) {
        return productService.adminGetProductById(productId);
    }

    private SalesConsultationDto.LookupResponse buildImeiMatch(ProductItem item, String keyword) {
        ProductVariant variant = item.getVariant();
        if (variant == null || variant.getProduct() == null) {
            throw new ResourceNotFoundException("IMEI/Serial không gắn với sản phẩm hợp lệ");
        }
        ProductDto.AdminProductResponse product = productService.adminGetProductById(variant.getProduct().getId());
        ProductDto.VariantDto matchedVariant = product.getVariants() == null ? null
                : product.getVariants().stream()
                        .filter(v -> v.getId().equals(variant.getId()))
                        .findFirst()
                        .orElse(null);

        return SalesConsultationDto.LookupResponse.builder()
                .matchType("IMEI")
                .keyword(keyword)
                .product(product)
                .matchedVariant(matchedVariant)
                .matchedItem(toMatchedItem(item))
                .build();
    }

    private SalesConsultationDto.LookupResponse buildSkuMatch(ProductVariant variant, String keyword, String matchType) {
        Product product = variant.getProduct();
        if (product == null) {
            throw new ResourceNotFoundException("SKU không gắn với sản phẩm");
        }
        ProductDto.AdminProductResponse detail = productService.adminGetProductById(product.getId());
        ProductDto.VariantDto matchedVariant = detail.getVariants() == null ? null
                : detail.getVariants().stream()
                        .filter(v -> v.getId().equals(variant.getId()))
                        .findFirst()
                        .orElse(null);

        return SalesConsultationDto.LookupResponse.builder()
                .matchType(matchType)
                .keyword(keyword)
                .product(detail)
                .matchedVariant(matchedVariant)
                .build();
    }

    private SalesConsultationDto.LookupResponse buildMultiSkuMatch(List<ProductVariant> variants, String keyword) {
        List<SalesConsultationDto.ProductSummary> summaries = new ArrayList<>();
        for (ProductVariant variant : variants) {
            if (variant.getProduct() == null) {
                continue;
            }
            ProductDto.AdminProductResponse detail = productService.adminGetProductById(variant.getProduct().getId());
            summaries.add(toSummary(detail, variant.getSkuCode()));
        }
        return SalesConsultationDto.LookupResponse.builder()
                .matchType("SKU")
                .keyword(keyword)
                .products(summaries)
                .build();
    }

    private SalesConsultationDto.LookupResponse buildNameListMatch(List<Product> products, String keyword) {
        List<SalesConsultationDto.ProductSummary> summaries = new ArrayList<>();
        for (Product product : products) {
            ProductDto.AdminProductResponse detail = productService.adminGetProductById(product.getId());
            summaries.add(toSummary(detail, null));
        }
        return SalesConsultationDto.LookupResponse.builder()
                .matchType("NAME")
                .keyword(keyword)
                .products(summaries)
                .build();
    }

    private SalesConsultationDto.ProductSummary toSummary(ProductDto.AdminProductResponse detail, String matchedSku) {
        int available = detail.getVariants() == null ? 0
                : detail.getVariants().stream()
                        .filter(v -> Boolean.TRUE.equals(v.getIsActive()))
                        .mapToInt(v -> v.getAvailableQuantity() != null ? v.getAvailableQuantity() : 0)
                        .sum();
        String imageUrl = detail.getImages() != null && !detail.getImages().isEmpty()
                ? detail.getImages().get(0).getLinkImage()
                : null;
        return SalesConsultationDto.ProductSummary.builder()
                .id(detail.getId())
                .name(detail.getName())
                .imageUrl(imageUrl)
                .basePrice(detail.getBasePrice())
                .totalAvailableQuantity(available)
                .warrantyPolicy(detail.getWarrantyPolicy())
                .matchedSku(matchedSku)
                .build();
    }

    private SalesConsultationDto.MatchedItem toMatchedItem(ProductItem item) {
        ProductItemStatus status = item.getStatus();
        String statusLabel = switch (status) {
            case AVAILABLE -> "Sẵn sàng bán";
            case RESERVED -> "Đang giữ cho đơn";
            case SOLD -> "Đã bán";
            case DEFECTIVE -> "Hàng lỗi";
            case IN_REPAIR -> "Đang sửa chữa";
        };
        return SalesConsultationDto.MatchedItem.builder()
                .id(item.getId())
                .imei(item.getImei())
                .serialNumber(item.getSerialNumber())
                .status(status)
                .statusLabel(statusLabel)
                .warrantyMonths(item.getWarrantyMonths())
                .build();
    }
}
