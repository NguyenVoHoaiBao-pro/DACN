package com.electro.catalog.controller;

import com.electro.catalog.dto.CategoryDto;
import com.electro.catalog.service.CategoryService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<CategoryDto.Response>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách danh mục thành công",
                categoryService.getAllCategoriesForAdmin()));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDto.Response>> createCategory(
            @Valid @RequestBody CategoryDto.CreateRequest request) {
        CategoryDto.Response category = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục thành công", category));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDto.Response>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryDto.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục thành công",
                categoryService.updateCategory(id, request)));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyAuthority('CATEGORY_VIEW', 'PRODUCT_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDto.Response>> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái danh mục thành công",
                categoryService.toggleStatus(id)));
    }
}
