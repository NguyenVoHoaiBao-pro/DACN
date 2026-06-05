package com.electro.review.controller;

import com.electro.review.entity.Review;
import com.electro.review.repository.ReviewRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Internal API cho service-to-service communication.
 * Không yêu cầu authentication — chỉ dùng nội bộ giữa các microservice.
 */
@RestController
@RequestMapping("/api/reviews/internal")
@RequiredArgsConstructor
public class InternalReviewController {

    private final ReviewRepository reviewRepository;

    // ─── GET /api/reviews/internal/user/{userId}/ratings ─────────────────────
    // Lấy danh sách rating đã duyệt của user, sắp xếp theo mới nhất
    @GetMapping("/user/{userId}/ratings")
    public List<UserRatingResponse> getUserRatings(
            @PathVariable Integer userId,
            @RequestParam(defaultValue = "5") int limit) {

        List<Review> reviews = reviewRepository.findByUserIdAndIsApprovedOrderByCreatedAtDesc(
                userId, true, PageRequest.of(0, limit));

        return reviews.stream()
                .filter(r -> r.getProductId() != null && r.getRating() != null)
                .map(r -> new UserRatingResponse(r.getProductId(), r.getRating().doubleValue()))
                .collect(Collectors.toList());
    }

    // ─── GET /api/reviews/internal/user/{userId}/reviewed-products ───────────
    // Lấy danh sách product_id mà user đã review (approved)
    @GetMapping("/user/{userId}/reviewed-products")
    public List<Integer> getUserReviewedProducts(@PathVariable Integer userId) {
        return reviewRepository.findApprovedProductIdsByUserId(userId);
    }

    // ─── GET /api/reviews/internal/popular-products ─────────────────────────
    // Lấy danh sách sản phẩm phổ biến (avg rating cao + nhiều review)
    @GetMapping("/popular-products")
    public List<PopularProductResponse> getPopularProducts(
            @RequestParam(defaultValue = "50") int limit) {

        List<Object[]> results = reviewRepository.findPopularProducts(PageRequest.of(0, limit));

        return results.stream()
                .map(row -> new PopularProductResponse(
                        (Integer) row[0],
                        ((Number) row[1]).doubleValue(),
                        ((Number) row[2]).longValue()))
                .collect(Collectors.toList());
    }

    // ─── GET /api/reviews/internal/all-ratings ──────────────────────────────
    // Lấy TOÀN BỘ ratings đã duyệt (cho training pipeline)
    @GetMapping("/all-ratings")
    public List<TrainingRatingResponse> getAllApprovedRatings() {
        List<Review> reviews = reviewRepository.findAllByIsApproved(true);

        return reviews.stream()
                .filter(r -> r.getUserId() != null && r.getProductId() != null && r.getRating() != null)
                .map(r -> new TrainingRatingResponse(
                        r.getUserId(), r.getProductId(), r.getRating().doubleValue()))
                .collect(Collectors.toList());
    }

    // ─── DTOs ────────────────────────────────────────────────────────────────

    @Data
    public static class UserRatingResponse {
        private final Integer productId;
        private final Double rating;

        public UserRatingResponse(Integer productId, Double rating) {
            this.productId = productId;
            this.rating = rating;
        }
    }

    @Data
    public static class PopularProductResponse {
        private final Integer productId;
        private final Double avgRating;
        private final Long reviewCount;

        public PopularProductResponse(Integer productId, Double avgRating, Long reviewCount) {
            this.productId = productId;
            this.avgRating = avgRating;
            this.reviewCount = reviewCount;
        }
    }

    @Data
    public static class TrainingRatingResponse {
        private final Integer userId;
        private final Integer productId;
        private final Double rating;

        public TrainingRatingResponse(Integer userId, Integer productId, Double rating) {
            this.userId = userId;
            this.productId = productId;
            this.rating = rating;
        }
    }
}
