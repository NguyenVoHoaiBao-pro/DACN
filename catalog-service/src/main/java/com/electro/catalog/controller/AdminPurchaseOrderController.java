package com.electro.catalog.controller;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.dto.PurchaseOrderDto;
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
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN', 'STOCK_IMPORT')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.Detail>> getById(@PathVariable Integer id) {
        // Cho phép đọc PO đã COMPLETED — trang Nhập Serial cần refresh sau khi quét xong
        return ResponseEntity.ok(ApiResponse.success("Purchase order", purchaseOrderService.getAdminDetail(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrder>> create(@Valid @RequestBody InventoryDto.PurchaseOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Purchase order created", purchaseOrderService.create(request)));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<PurchaseOrderDto.ListItem>>> adminListAll() {
        return ResponseEntity.ok(ApiResponse.success("All purchase orders", purchaseOrderService.listAdminAll()));
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<PurchaseOrderDto.ListItem>>> pendingApproval() {
        return ResponseEntity.ok(ApiResponse.success("PO chờ duyệt", purchaseOrderService.listPendingApproval()));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.Detail>> adminDetail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("PO detail", purchaseOrderService.getAdminDetail(id)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.Detail>> approve(
            @PathVariable Integer id,
            @RequestBody(required = false) PurchaseOrderDto.ApproveRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt đơn mua hàng",
                purchaseOrderService.approve(id, request)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.Detail>> reject(
            @PathVariable Integer id,
            @RequestBody(required = false) PurchaseOrderDto.RejectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối đơn mua hàng",
                purchaseOrderService.reject(id, request)));
    }

    @PostMapping("/{id}/mark-in-transit")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.Detail>> markInTransit(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Đã chuyển trạng thái Đang vận chuyển",
                purchaseOrderService.markInTransit(id)));
    }

    @GetMapping("/{poId}/stock-lots")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'IMEI_MANAGE', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<PurchaseOrderDto.StockLotSummary>>> listStockLots(
            @PathVariable Integer poId) {
        return ResponseEntity.ok(ApiResponse.success("Danh sách mã lô",
                purchaseOrderService.listOpenLots(poId)));
    }

    @GetMapping("/stock-lots/by-serial/{serial}")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'IMEI_MANAGE', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<PurchaseOrderDto.StockLotSummary>>> lotBySerial(
            @PathVariable String serial) {
        return ResponseEntity.ok(ApiResponse.success("Tra cứu lô theo Serial",
                purchaseOrderService.findLotBySerial(serial)));
    }

    @PostMapping("/stock-lots/{lotId}/recall")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.StockLotSummary>> recallLot(
            @PathVariable Integer lotId,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu thu hồi lô",
                purchaseOrderService.flagLotRecall(lotId, reason)));
    }

    // ─── Warehouse receiving flow ───────────────────────────────────────────

    @GetMapping("/warehouse/queue")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<PurchaseOrderDto.ListItem>>> warehouseQueue(
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(ApiResponse.success(
                "Danh sách PO chờ nhập kho",
                purchaseOrderService.listWarehouseQueue(q)));
    }

    @GetMapping("/warehouse/imei-queue")
    @PreAuthorize("hasAnyAuthority('IMEI_MANAGE', 'STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<List<PurchaseOrderDto.ListItem>>> imeiQueue() {
        return ResponseEntity.ok(ApiResponse.success(
                "Danh sách PO chờ quét Serial",
                purchaseOrderService.listForImeiEntry()));
    }

    @PostMapping("/{id}/start-receiving")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.Detail>> startReceiving(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Bắt đầu kiểm đếm",
                purchaseOrderService.startReceiving(id)));
    }

    @PostMapping("/{id}/preview-receive")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.DiscrepancyPreview>> previewReceive(
            @PathVariable Integer id,
            @Valid @RequestBody PurchaseOrderDto.ConfirmReceiveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Xem trước sai lệch",
                purchaseOrderService.previewReceive(id, request)));
    }

    @PostMapping("/{id}/confirm-receive")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'ROLE_ADMIN', 'PRODUCT_MANAGE')")
    public ResponseEntity<ApiResponse<PurchaseOrderDto.ConfirmReceiveResponse>> confirmReceive(
            @PathVariable Integer id,
            @Valid @RequestBody PurchaseOrderDto.ConfirmReceiveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Nhập kho thành công",
                purchaseOrderService.confirmReceive(id, request)));
    }
}
