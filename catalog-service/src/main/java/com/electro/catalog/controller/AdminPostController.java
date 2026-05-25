package com.electro.catalog.controller;

import com.electro.catalog.dto.BlogPostDto;
import com.electro.catalog.service.BlogPostService;
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

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('POST_MANAGE', 'ROLE_ADMIN', 'ADMIN', 'PRODUCT_MANAGE')")
public class AdminPostController {

    private final BlogPostService blogPostService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<BlogPostDto.Response>>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "publishDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<BlogPostDto.Response> result = blogPostService.search(keyword, status, category, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài viết thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BlogPostDto.Response>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết bài viết", blogPostService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BlogPostDto.Response>> create(@Valid @RequestBody BlogPostDto.Request request) {
        BlogPostDto.Response created = blogPostService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bài viết thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BlogPostDto.Response>> update(
            @PathVariable Integer id,
            @Valid @RequestBody BlogPostDto.Request request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật bài viết thành công", blogPostService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer id) {
        blogPostService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa bài viết thành công", null));
    }
}
