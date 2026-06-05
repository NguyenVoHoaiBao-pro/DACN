package com.electro.catalog.controller;

import com.electro.catalog.dto.ProductDto;
import com.electro.catalog.dto.SalesConsultationDto;
import com.electro.catalog.service.SalesConsultationService;
import com.electro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/sales-consultation")
@RequiredArgsConstructor
public class AdminSalesConsultationController {

    private final SalesConsultationService salesConsultationService;

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyAuthority('PRODUCT_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<SalesConsultationDto.LookupResponse>> lookup(
            @RequestParam("keyword") String keyword) {
        return ResponseEntity.ok(ApiResponse.success("Tra cứu tư vấn Sales",
                salesConsultationService.lookup(keyword)));
    }

    @GetMapping("/products/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<ProductDto.AdminProductResponse>> detail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết tư vấn sản phẩm",
                salesConsultationService.getConsultationDetail(id)));
    }
}
