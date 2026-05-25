package com.electro.catalog.controller;

import com.electro.catalog.dto.BannerDto;
import com.electro.catalog.service.BannerService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('BANNER_MANAGE', 'ROLE_ADMIN')")
public class AdminBannerController {

    private final BannerService bannerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BannerDto.Response>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách banner thành công", bannerService.getAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BannerDto.Response>> create(@Valid @RequestBody BannerDto.Request request) {
        BannerDto.Response created = bannerService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo banner thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BannerDto.Response>> update(
            @PathVariable Integer id,
            @Valid @RequestBody BannerDto.Request request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật banner thành công", bannerService.update(id, request)));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<BannerDto.Response>> toggleStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái banner thành công",
                bannerService.toggleStatus(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer id) {
        bannerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa banner thành công", null));
    }
}
