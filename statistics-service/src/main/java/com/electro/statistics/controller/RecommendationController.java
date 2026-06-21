package com.electro.statistics.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.statistics.service.AIRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final AIRecommendationService recommendationService;

    /** Trang chu — gợi ý cá nhân SVD. */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRecommendations(
            @PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Recommendations retrieved",
                recommendationService.getRecommendationsForUser(userId)));
    }

    /** Trang chi tiết SP — Hybrid (user + anchor). */
    @GetMapping("/hybrid/{userId}/{anchorProductId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHybridRecommendations(
            @PathVariable Integer userId,
            @PathVariable Integer anchorProductId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Hybrid recommendations retrieved",
                recommendationService.getHybridRecommendations(userId, anchorProductId)));
    }

    /** Trang chi tiết SP — tương tự nội dung (CBF, guest OK). */
    @GetMapping("/similar/{productId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSimilarProducts(
            @PathVariable Integer productId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Similar products retrieved",
                recommendationService.getSimilarProducts(productId)));
    }
}
