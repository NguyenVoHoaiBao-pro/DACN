package com.electro.order.controller;

import com.electro.order.dto.CouponDto;
import com.electro.order.service.CouponService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ORDER_VIEW_ALL', 'ROLE_ADMIN')")
public class AdminCouponController {

    private final CouponService couponService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CouponDto.Response>>> getCoupons(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<CouponDto.Response> result = couponService.getAllCoupons(keyword, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá thành công", result));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<CouponDto.Response>>> getActiveCoupons() {
        return ResponseEntity.ok(ApiResponse.success("Lấy mã giảm giá đang hoạt động",
                couponService.getActiveCoupons()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CouponDto.Response>> getCouponById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết mã giảm giá", couponService.getCouponById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CouponDto.Response>> createCoupon(
            @Valid @RequestBody CouponDto.CreateRequest request) {
        CouponDto.Response created = couponService.createCoupon(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mã giảm giá thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CouponDto.Response>> updateCoupon(
            @PathVariable Integer id,
            @Valid @RequestBody CouponDto.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mã giảm giá thành công",
                couponService.updateCoupon(id, request)));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<CouponDto.Response>> toggleCoupon(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái mã giảm giá thành công",
                couponService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCoupon(@PathVariable Integer id) {
        couponService.deleteCoupon(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mã giảm giá thành công", null));
    }
}
