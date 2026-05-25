package com.electro.user.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.user.dto.WishlistDto;
import com.electro.user.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WishlistDto.Response>>> getWishlist(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.success("Wishlist retrieved", wishlistService.getUserWishlist(username, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WishlistDto.Response>> addToWishlist(@RequestBody WishlistDto.Request request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        WishlistDto.Response response = wishlistService.addToWishlist(username, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Added to wishlist", response));
    }

    @DeleteMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<Void>> removeByProduct(@PathVariable Integer productId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        wishlistService.removeFromWishlist(username, productId);
        return ResponseEntity.ok(ApiResponse.success("Removed from wishlist", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> removeById(@PathVariable Integer id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        wishlistService.removeWishlistItem(username, id);
        return ResponseEntity.ok(ApiResponse.success("Removed from wishlist", null));
    }

    @GetMapping("/check/{productId}")
    public ResponseEntity<ApiResponse<Boolean>> checkStatus(@PathVariable Integer productId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(ApiResponse.success("Status checked", wishlistService.checkWishlistStatus(username, productId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearWishlist() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        wishlistService.clearWishlist(username);
        return ResponseEntity.ok(ApiResponse.success("Wishlist cleared", null));
    }
}
