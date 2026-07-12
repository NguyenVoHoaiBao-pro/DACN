package com.electro.catalog.controller;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.service.SupplierService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/suppliers")
@RequiredArgsConstructor
public class AdminSupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN', 'STOCK_IMPORT')")
    public ResponseEntity<ApiResponse<List<InventoryDto.SupplierResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Suppliers", supplierService.getAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<InventoryDto.SupplierResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Supplier", supplierService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<InventoryDto.SupplierResponse>> create(@Valid @RequestBody InventoryDto.SupplierRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Supplier created", supplierService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<InventoryDto.SupplierResponse>> update(
            @PathVariable Integer id, @Valid @RequestBody InventoryDto.SupplierRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Supplier updated", supplierService.update(id, request)));
    }
}
