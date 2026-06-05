package com.electro.order.controller;

import com.electro.order.client.UserClient;
import com.electro.order.dto.UserDto;
import com.electro.order.dto.WarrantyDto;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.service.WarrantyClaimService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/warranty/claims")
@RequiredArgsConstructor
public class WarrantyClaimController {

    private final WarrantyClaimService warrantyClaimService;
    private final UserClient userClient;

    @GetMapping("/mine/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> myClaimDetail(@PathVariable Integer id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDto.Response user = userClient.getUserByUsername(username);
        if (user == null) {
            throw new ResourceNotFoundException("User", "username", username);
        }
        return ResponseEntity.ok(ApiResponse.success("Chi tiết yêu cầu bảo hành",
                warrantyClaimService.getMyClaimDetail(user.getId(), id)));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<WarrantyDto.ClaimSummaryResponse>>> myClaims(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDto.Response user = userClient.getUserByUsername(username);
        if (user == null) {
            throw new ResourceNotFoundException("User", "username", username);
        }
        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(page, size,
                        org.springframework.data.domain.Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success("Danh sách yêu cầu bảo hành của bạn",
                warrantyClaimService.listMyClaims(user.getId(), pageable)));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<WarrantyDto.ClaimDetailResponse>> submit(
            @Valid @RequestBody WarrantyDto.ClaimSubmitRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDto.Response user = userClient.getUserByUsername(username);
        if (user == null) {
            throw new ResourceNotFoundException("User", "username", username);
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi yêu cầu bảo hành",
                        warrantyClaimService.submitClaim(user.getId(), request)));
    }
}
