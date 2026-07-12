package com.electro.catalog.controller;

import com.electro.catalog.dto.ProductReturnDto;
import com.electro.catalog.service.ProductReturnService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory/returns")
@RequiredArgsConstructor
public class AdminProductReturnController {

    private final ProductReturnService productReturnService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<ProductReturnDto.Summary>>> list(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success("Danh sách phiếu hoàn trả",
                productReturnService.list(status)));
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductReturnDto.LookupResponse>> lookup(
            @RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.success("Tra cứu Serial hoàn trả",
                productReturnService.lookup(keyword)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductReturnDto.Detail>> detail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết phiếu hoàn trả",
                productReturnService.getDetail(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductReturnDto.Detail>> open(
            @Valid @RequestBody ProductReturnDto.OpenRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã tạo phiếu hoàn trả",
                productReturnService.open(request)));
    }

    @PostMapping("/{id}/process")
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<ProductReturnDto.Detail>> process(
            @PathVariable Integer id,
            @Valid @RequestBody ProductReturnDto.ProcessRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý hoàn kho",
                productReturnService.process(id, request)));
    }
}
