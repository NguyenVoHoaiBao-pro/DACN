package com.electro.catalog.controller;

import com.electro.catalog.dto.AttributeDto;
import com.electro.catalog.dto.AttributeValueDto;
import com.electro.catalog.service.AttributeService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAttributeController {

    private final AttributeService attributeService;

    @GetMapping("/attributes")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AttributeDto.Response>>> getAttributes() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thuộc tính thành công",
                attributeService.getAllAttributes()));
    }

    @PostMapping("/attributes")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AttributeDto.Response>> createAttribute(
            @Valid @RequestBody AttributeDto.CreateRequest request) {
        AttributeDto.Response created = attributeService.createAttribute(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo thuộc tính thành công", created));
    }

    @PutMapping("/attributes/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AttributeDto.Response>> updateAttribute(
            @PathVariable Integer id,
            @Valid @RequestBody AttributeDto.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thuộc tính thành công",
                attributeService.updateAttribute(id, request)));
    }

    @DeleteMapping("/attributes/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAttribute(@PathVariable Integer id) {
        attributeService.deleteAttribute(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa thuộc tính thành công", null));
    }

    @GetMapping("/attributes/{attributeId}/values")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AttributeValueDto.Response>>> getValuesByAttribute(
            @PathVariable Integer attributeId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy giá trị thuộc tính thành công",
                attributeService.getAttributeValuesByAttributeId(attributeId)));
    }

    @GetMapping("/attribute-values")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AttributeValueDto.Response>>> getAllAttributeValues() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giá trị thuộc tính thành công",
                attributeService.getAllAttributeValues()));
    }

    @PostMapping("/attribute-values")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AttributeValueDto.Response>> createAttributeValue(
            @Valid @RequestBody AttributeValueDto.CreateRequest request) {
        AttributeValueDto.Response created = attributeService.createAttributeValue(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo giá trị thuộc tính thành công", created));
    }

    @PutMapping("/attribute-values/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AttributeValueDto.Response>> updateAttributeValue(
            @PathVariable Integer id,
            @Valid @RequestBody AttributeValueDto.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật giá trị thuộc tính thành công",
                attributeService.updateAttributeValue(id, request)));
    }

    @DeleteMapping("/attribute-values/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAttributeValue(@PathVariable Integer id) {
        attributeService.deleteAttributeValue(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa giá trị thuộc tính thành công", null));
    }
}
