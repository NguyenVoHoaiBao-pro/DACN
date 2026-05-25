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

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRecommendations(
            @PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Recommendations retrieved",
                recommendationService.getRecommendationsForUser(userId)));
    }
}
