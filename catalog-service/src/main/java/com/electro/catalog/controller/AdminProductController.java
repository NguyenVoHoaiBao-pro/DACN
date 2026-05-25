package com.electro.catalog.controller;

import com.electro.catalog.dto.ProductDto;
import com.electro.catalog.service.ProductService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductService productService;

    @GetMapping
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<Page<ProductDto.AdminProductListResponse>>> getAllProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Integer productTypeId,
            @RequestParam(required = false) Integer producerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductDto.AdminProductListResponse> products =
                productService.adminGetAllProducts(keyword, isActive, productTypeId, producerId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Admin products retrieved", products));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProductStats() {
        return ResponseEntity.ok(ApiResponse.success("Product stats", productService.adminGetProductStats()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> getProductById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Product retrieved", productService.adminGetProductById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> createProduct(
            @Valid @RequestBody ProductDto.AdminCreateRequest request) {
        ProductDto.AdminProductResponse product = productService.adminCreateProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created", product));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> updateProduct(
            @PathVariable Integer id,
            @Valid @RequestBody ProductDto.AdminUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Product updated", productService.adminUpdateProduct(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Integer id) {
        productService.adminDeleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deactivated", null));
    }

    @PutMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> toggleStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Status toggled", productService.adminToggleStatus(id)));
    }

    @PostMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> addVariant(
            @PathVariable Integer id,
            @Valid @RequestBody ProductDto.AdminVariantRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Variant added", productService.adminAddVariant(id, request)));
    }

    @PutMapping("/{productId}/variants/{variantId}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> updateVariant(
            @PathVariable Integer productId,
            @PathVariable Integer variantId,
            @Valid @RequestBody ProductDto.AdminVariantRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Variant updated", productService.adminUpdateVariant(productId, variantId, request)));
    }

    @DeleteMapping("/{productId}/variants/{variantId}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> deleteVariant(
            @PathVariable Integer productId,
            @PathVariable Integer variantId) {
        return ResponseEntity.ok(
                ApiResponse.success("Variant deactivated", productService.adminDeleteVariant(productId, variantId)));
    }

    @PostMapping("/{id}/images")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> addImage(
            @PathVariable Integer id,
            @Valid @RequestBody ProductDto.AdminImageRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Image added", productService.adminAddImage(id, request)));
    }

    @DeleteMapping("/{productId}/images/{imageId}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> deleteImage(
            @PathVariable Integer productId,
            @PathVariable Integer imageId) {
        return ResponseEntity.ok(
                ApiResponse.success("Image deleted", productService.adminDeleteImage(productId, imageId)));
    }
}
