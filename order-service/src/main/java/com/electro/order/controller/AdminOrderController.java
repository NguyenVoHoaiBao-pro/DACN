package com.electro.order.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.order.dto.OrderDto;
import com.electro.order.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasAnyAuthority('ORDER_VIEW_ALL', 'ROLE_ADMIN', 'ADMIN')")
public class AdminOrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderDto.AdminOrderSummaryResponse>>> getAllOrders(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "keyword", required = false) String keyword) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("orderDate").descending());
        Page<OrderDto.AdminOrderSummaryResponse> orders =
                orderService.adminGetAllOrders(status, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Orders retrieved successfully", orders));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<OrderDto.OrderStatsResponse>> getOrderStats() {
        return ResponseEntity.ok(ApiResponse.success("Order stats", orderService.getOrderStats()));
    }

    @GetMapping("/hidden")
    public ResponseEntity<ApiResponse<Page<OrderDto.AdminOrderSummaryResponse>>> getHiddenOrders(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("hiddenAt").descending());
        return ResponseEntity.ok(ApiResponse.success("Hidden orders",
                orderService.adminGetHiddenOrders(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDto.AdminOrderResponse>> getOrderById(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Order detail", orderService.adminGetOrderById(id)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderDto.AdminOrderResponse>> updateStatus(
            @PathVariable("id") Integer id,
            @Valid @RequestBody OrderDto.UpdateStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Order status updated",
                orderService.adminUpdateOrderStatus(id, request)));
    }

    @PutMapping("/{id}/payment-status")
    public ResponseEntity<ApiResponse<OrderDto.AdminOrderResponse>> updatePaymentStatus(
            @PathVariable("id") Integer id,
            @Valid @RequestBody OrderDto.UpdatePaymentStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment status updated",
                orderService.adminUpdatePaymentStatus(id, request)));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderDto.AdminOrderResponse>> cancelOrder(
            @PathVariable("id") Integer id,
            @RequestBody(required = false) OrderDto.CancelRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Order cancelled",
                orderService.adminCancelOrder(id, request)));
    }

    @PutMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<OrderDto.AdminOrderResponse>> toggleVisibility(
            @PathVariable("id") Integer id,
            @Valid @RequestBody OrderDto.UpdateVisibilityRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Order visibility updated",
                orderService.adminToggleOrderVisibility(id, request)));
    }

    @PutMapping("/{id}/assign-imei")
    public ResponseEntity<ApiResponse<OrderDto.AdminOrderResponse>> assignImei(
            @PathVariable("id") Integer id,
            @Valid @RequestBody OrderDto.AssignImeiRequest request) {
        return ResponseEntity.ok(ApiResponse.success("IMEI assigned successfully",
                orderService.assignImeiToOrder(id, request)));
    }
}
