package com.electro.order.controller;

import com.electro.order.dto.WarrantyDto;
import com.electro.order.service.WarrantyService;
import com.electro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/warranty")
@RequiredArgsConstructor
public class AdminWarrantyController {

    private final WarrantyService warrantyService;

    @PutMapping("/{code}/status")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<WarrantyDto.Response>> updateWarrantyStatus(
            @PathVariable("code") String code,
            @RequestParam("status") String status) {
        WarrantyDto.Response response = warrantyService.updateWarrantyStatus(code, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thiết bị thành công", response));
    }

    @PostMapping("/tickets")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<WarrantyDto.TicketResponse>> createTicket(@RequestBody WarrantyDto.TicketRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(ApiResponse.success("Đã tạo phiếu tiếp nhận bảo hành",
                warrantyService.createWarrantyTicket(username, request)));
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Page<WarrantyDto.TicketResponse>>> getAllTickets(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("receivedAt").descending());
        return ResponseEntity.ok(ApiResponse.success("Danh sách phiếu bảo hành",
                warrantyService.getAllTickets(keyword, status, pageable)));
    }

    @GetMapping("/tickets/{id}")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<WarrantyDto.TicketResponse>> getTicketById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết phiếu bảo hành", warrantyService.getTicketById(id)));
    }

    @PutMapping("/tickets/{id}/status")
    @PreAuthorize("hasAnyAuthority('WARRANTY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<WarrantyDto.TicketResponse>> updateTicketStatus(
            @PathVariable Integer id,
            @RequestBody WarrantyDto.TicketUpdateAdminRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phiếu bảo hành",
                warrantyService.updateTicketStatus(id, request)));
    }
}
