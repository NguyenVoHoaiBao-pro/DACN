package com.electro.catalog.controller;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.service.InventoryService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
public class AdminInventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/import")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<String>> importStock(@Valid @RequestBody InventoryDto.ImportStockRequest request) {
        inventoryService.importStock(request);
        return ResponseEntity.ok(ApiResponse.success("Lập phiếu nhập kho thành công", null));
    }

    @PostMapping("/return")
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<String>> returnStock(@Valid @RequestBody InventoryDto.ReturnStockRequest request) {
        inventoryService.returnStock(request);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận kho cho hàng trả lại", null));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('INVENTORY_STAT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<InventoryDto.InventoryStat>>> getInventoryStats(
            @RequestParam(defaultValue = "10") int lowStockThreshold) {
        return ResponseEntity.ok(ApiResponse.success("Báo cáo tồn kho", inventoryService.getInventoryStats(lowStockThreshold)));
    }

    @PostMapping("/imei")
    @PreAuthorize("hasAnyAuthority('IMEI_MANAGE', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<String>> addImeiToProduct(@Valid @RequestBody InventoryDto.ImeiRequest request) {
        inventoryService.addImeiToProduct(request);
        return ResponseEntity.ok(ApiResponse.success("Đã lưu danh sách IMEI vào hệ thống", null));
    }

    @GetMapping("/variants/search")
    @PreAuthorize("hasAnyAuthority('IMEI_MANAGE', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<InventoryDto.VariantAutocomplete>>> searchVariants(@RequestParam("q") String keyword) {
        return ResponseEntity.ok(ApiResponse.success("Kết quả tra cứu", inventoryService.searchVariants(keyword)));
    }

    @PostMapping("/imei/upload-excel")
    @PreAuthorize("hasAnyAuthority('IMEI_MANAGE', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<String>> uploadImeiExcel(@RequestParam("file") MultipartFile file) {
        inventoryService.importImeiFromExcel(file);
        return ResponseEntity.ok(ApiResponse.success("Import IMEI từ file Excel thành công", null));
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyAuthority('INVENTORY_STAT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<InventoryDto.InventoryResponse>>> getInventoryTransactions() {
        return ResponseEntity.ok(ApiResponse.success("Lịch sử biến động kho", inventoryService.getInventoryTransactions()));
    }
}
