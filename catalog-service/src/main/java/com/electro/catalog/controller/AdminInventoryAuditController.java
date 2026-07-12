package com.electro.catalog.controller;

import com.electro.catalog.dto.InventoryAuditDto;
import com.electro.catalog.service.InventoryAuditService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory-audits")
@RequiredArgsConstructor
public class AdminInventoryAuditController {

    private final InventoryAuditService inventoryAuditService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<InventoryAuditDto.Summary>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Danh sách phiếu kiểm kê",
                inventoryAuditService.listAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.Detail>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết kiểm kê",
                inventoryAuditService.getDetail(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.Summary>> create(
            @Valid @RequestBody InventoryAuditDto.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu kiểm kê",
                inventoryAuditService.create(request)));
    }

    @PostMapping("/{id}/scan")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.ScanResponse>> scan(
            @PathVariable Integer id,
            @Valid @RequestBody InventoryAuditDto.ScanRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Quét thành công",
                inventoryAuditService.scan(id, request)));
    }

    @PostMapping("/{id}/scan-bulk")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.BulkScanResponse>> scanBulk(
            @PathVariable Integer id,
            @RequestBody InventoryAuditDto.BulkScanRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Import danh sách Serial thành công",
                inventoryAuditService.scanBulk(id, request)));
    }

    @GetMapping("/{id}/counting-progress")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.CountingProgress>> countingProgress(
            @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Tiến độ kiểm đếm",
                inventoryAuditService.getCountingProgress(id)));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.CompleteResponse>> complete(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Hoàn tất kiểm đếm",
                inventoryAuditService.complete(id)));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.Detail>> submit(
            @PathVariable Integer id,
            @RequestBody(required = false) InventoryAuditDto.SubmitRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi báo cáo chênh lệch",
                inventoryAuditService.submit(id, request != null ? request : new InventoryAuditDto.SubmitRequest())));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'PRODUCT_MANAGE', 'USER_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.Detail>> approve(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt điều chỉnh tồn kho",
                inventoryAuditService.approve(id, null)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'PRODUCT_MANAGE', 'USER_MANAGE')")
    public ResponseEntity<ApiResponse<InventoryAuditDto.Detail>> reject(
            @PathVariable Integer id,
            @RequestBody(required = false) InventoryAuditDto.RejectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối phiếu kiểm kê",
                inventoryAuditService.reject(id, request)));
    }
}
