package com.electro.order.controller;

import com.electro.order.dto.OrderDto;
import com.electro.order.service.OrderService;
import com.electro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class WarehouseReturnLookupController {

    private final OrderService orderService;

    @GetMapping("/return-context")
    @PreAuthorize("hasAnyAuthority('STOCK_RETURN', 'ROLE_ADMIN', 'PRODUCT_MANAGE', 'ORDER_VIEW_ALL')")
    public ResponseEntity<ApiResponse<OrderDto.ReturnContextResponse>> lookupReturnContext(
            @RequestParam("keyword") String keyword) {
        return ResponseEntity.ok(ApiResponse.success("Tra cứu đơn hoàn trả",
                orderService.lookupReturnContext(keyword)));
    }
}
