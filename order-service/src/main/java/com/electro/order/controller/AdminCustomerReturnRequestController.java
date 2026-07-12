package com.electro.order.controller;

import com.electro.order.dto.CustomerReturnRequestDto;
import com.electro.order.service.CustomerReturnRequestService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders/return-requests")
@RequiredArgsConstructor
public class AdminCustomerReturnRequestController {

    private final CustomerReturnRequestService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('RETURN_REQUEST_REVIEW', 'ORDER_VIEW_ALL', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<CustomerReturnRequestDto.Summary>>> list(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success("Danh sách yêu cầu trả hàng khách",
                service.listForAdmin(status)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('RETURN_REQUEST_REVIEW', 'ORDER_VIEW_ALL', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> detail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết yêu cầu trả hàng",
                service.getForAdmin(id)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('RETURN_REQUEST_REVIEW', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> approve(
            @PathVariable Integer id,
            @RequestBody(required = false) CustomerReturnRequestDto.ReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt yêu cầu trả hàng",
                service.approve(id, request)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('RETURN_REQUEST_REVIEW', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> reject(
            @PathVariable Integer id,
            @Valid @RequestBody CustomerReturnRequestDto.RejectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối yêu cầu trả hàng",
                service.reject(id, request)));
    }
}
