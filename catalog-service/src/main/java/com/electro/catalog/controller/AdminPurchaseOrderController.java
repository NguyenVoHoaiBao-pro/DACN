package com.electro.catalog.controller;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.entity.PurchaseOrder;
import com.electro.catalog.service.PurchaseOrderService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/purchase-orders")
@RequiredArgsConstructor
public class AdminPurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<PurchaseOrder>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Purchase orders", purchaseOrderService.getAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrder>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Purchase order", purchaseOrderService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrder>> create(@Valid @RequestBody InventoryDto.PurchaseOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Purchase order created", purchaseOrderService.create(request)));
    }
}
