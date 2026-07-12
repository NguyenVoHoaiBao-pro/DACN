package com.electro.order.controller;

import com.electro.order.client.UserClient;
import com.electro.order.dto.CustomerReturnRequestDto;
import com.electro.order.dto.UserDto;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.service.CustomerReturnRequestService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders/return-requests")
@RequiredArgsConstructor
public class CustomerReturnRequestController {

    private final CustomerReturnRequestService service;
    private final UserClient userClient;

    @PostMapping
    @PreAuthorize("hasAuthority('USER_ORDER_HISTORY')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> create(
            @Valid @RequestBody CustomerReturnRequestDto.CreateRequest request) {
        Integer userId = resolveUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi yêu cầu trả hàng",
                        service.create(userId, request)));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAuthority('USER_ORDER_HISTORY')")
    public ResponseEntity<ApiResponse<List<CustomerReturnRequestDto.Summary>>> listMine() {
        return ResponseEntity.ok(ApiResponse.success("Danh sách yêu cầu trả hàng",
                service.listMine(resolveUserId())));
    }

    @GetMapping("/mine/{id}")
    @PreAuthorize("hasAuthority('USER_ORDER_HISTORY')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> getMine(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết yêu cầu trả hàng",
                service.getMine(resolveUserId(), id)));
    }

    @PostMapping("/mine/{id}/ship")
    @PreAuthorize("hasAuthority('USER_ORDER_HISTORY')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> markShipped(
            @PathVariable Integer id,
            @RequestBody(required = false) CustomerReturnRequestDto.ShipRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận bạn đã gửi hàng về",
                service.markShippedByCustomer(resolveUserId(), id, request)));
    }

    @PostMapping("/mine/{id}/cancel")
    @PreAuthorize("hasAuthority('USER_ORDER_HISTORY')")
    public ResponseEntity<ApiResponse<CustomerReturnRequestDto.Detail>> cancel(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Đã hủy yêu cầu trả hàng",
                service.cancelByCustomer(resolveUserId(), id)));
    }

    private Integer resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDto.Response user = userClient.getUserByUsername(username);
        if (user == null) {
            throw new ResourceNotFoundException("User", "username", username);
        }
        return user.getId();
    }
}
