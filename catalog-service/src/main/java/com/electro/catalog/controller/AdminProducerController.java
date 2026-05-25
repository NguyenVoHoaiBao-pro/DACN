package com.electro.catalog.controller;

import com.electro.catalog.dto.ProducerDto;
import com.electro.catalog.service.ProducerService;
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
@RequestMapping("/api/admin/producers")
@RequiredArgsConstructor
public class AdminProducerController {

    private final ProducerService producerService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Page<ProducerDto.Response>>> getProducers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ProducerDto.Response> result = producerService.getAllProducers(pageable, keyword, isActive);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thương hiệu thành công", result));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<ProducerDto.SlimResponse>>> getAllProducersSlim() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thương hiệu thành công",
                producerService.getAllProducersSlim(null)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProducerDto.Response>> getProducerById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết thương hiệu", producerService.getProducerById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProducerDto.Response>> createProducer(
            @Valid @RequestBody ProducerDto.Request request) {
        ProducerDto.Response created = producerService.createProducer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo thương hiệu thành công", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProducerDto.Response>> updateProducer(
            @PathVariable Integer id,
            @Valid @RequestBody ProducerDto.Request request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thương hiệu thành công",
                producerService.updateProducer(id, request)));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProducerDto.Response>> toggleStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thành công",
                producerService.toggleStatus(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProducer(@PathVariable Integer id) {
        producerService.deleteProducer(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý thương hiệu", null));
    }
}
