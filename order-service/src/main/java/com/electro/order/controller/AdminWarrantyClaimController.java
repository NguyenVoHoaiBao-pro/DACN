package com.electro.order.controller;

import com.electro.order.dto.GHNDto;
import com.electro.order.dto.WarrantyDto;
import com.electro.order.service.WarrantyClaimService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/warranty/claims")
@RequiredArgsConstructor
public class AdminWarrantyClaimController {

    private final WarrantyClaimService warrantyClaimService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'CUSTOMER_VIEW', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<Page<WarrantyDto.ClaimSummaryResponse>>> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "keyword", required = false) String keyword) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success("Danh sách yêu cầu bảo hành",
                warrantyClaimService.listClaims(keyword, status, pageable)));
    }

    @GetMapping("/inbound/lookup")
    @PreAuthorize("hasAnyAuthority('STOCK_IMPORT', 'IMEI_MANAGE', 'WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimInboundView>> inboundLookup(
            @RequestParam("keyword") String keyword) {
        return ResponseEntity.ok(ApiResponse.success("Ticket chờ nhận tại kho",
                warrantyClaimService.lookupForInbound(keyword)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'CUSTOMER_VIEW', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES', 'STOCK_IMPORT', 'IMEI_MANAGE')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> detail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết yêu cầu bảo hành",
                warrantyClaimService.getClaimDetail(id)));
    }

    @GetMapping("/{id}/return-tracking")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'CUSTOMER_VIEW', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES', 'STOCK_IMPORT', 'IMEI_MANAGE')")
    public ResponseEntity<ApiResponse<GHNDto.TrackingResponse>> returnTracking(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Hành trình thu hồi GHN",
                warrantyClaimService.getReturnTracking(id)));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> approve(
            @PathVariable Integer id,
            @RequestBody(required = false) WarrantyDto.ClaimVerifyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt thu hồi hàng",
                warrantyClaimService.approveForCollection(id, request)));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> reject(
            @PathVariable Integer id,
            @Valid @RequestBody WarrantyDto.ClaimRejectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối yêu cầu",
                warrantyClaimService.rejectClaim(id, request)));
    }

    @PutMapping("/{id}/received")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN', 'STOCK_IMPORT', 'IMEI_MANAGE')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> markReceived(
            @PathVariable Integer id,
            @RequestBody(required = false) @Valid WarrantyDto.ClaimInboundReceiveRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận nhận máy tại kho",
                warrantyClaimService.markReceived(id, request)));
    }

    @PutMapping("/{id}/inspection")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> inspection(
            @PathVariable Integer id,
            @Valid @RequestBody WarrantyDto.ClaimInspectionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật biên bản kỹ thuật",
                warrantyClaimService.submitInspection(id, request)));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> resolve(
            @PathVariable Integer id,
            @Valid @RequestBody WarrantyDto.ClaimResolveRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận phán quyết",
                warrantyClaimService.resolveClaim(id, request)));
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> close(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Đã hoàn tất ticket",
                warrantyClaimService.closeTicket(id)));
    }
}
