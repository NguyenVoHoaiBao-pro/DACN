package com.electro.review.service;

import com.electro.review.client.CatalogClient;
import com.electro.review.client.OrderClient;
import com.electro.review.client.UserClient;
import com.electro.review.dto.CatalogClientDto;
import com.electro.review.dto.ReviewDto;
import com.electro.review.dto.UserClientDto;
import com.electro.review.entity.Review;
import com.electro.review.entity.ReviewImage;
import com.electro.review.exception.BadRequestException;
import com.electro.review.exception.ResourceNotFoundException;
import com.electro.review.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private CatalogClient catalogClient;

    @Autowired
    private UserClient userClient;

    @Autowired
    private OrderClient orderClient;

    @Transactional(readOnly = true)
    public Page<ReviewDto.Response> getProductReviews(Integer productId, Integer rating, Pageable pageable) {
        validateProductExists(productId);

        Page<Review> reviews;
        if (rating != null && rating >= 1 && rating <= 5) {
            reviews = reviewRepository.findByProductIdAndIsApprovedAndRating(productId, true, rating, pageable);
        } else {
            reviews = reviewRepository.findByProductIdAndIsApproved(productId, true, pageable);
        }

        return reviews.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public ReviewDto.ReviewSummary getReviewSummary(Integer productId) {
        validateProductExists(productId);

        Double avgRating = reviewRepository.findAverageRatingByProductId(productId);
        Integer totalReviews = reviewRepository.countApprovedByProductId(productId);
        List<Object[]> ratingCounts = reviewRepository.countByProductIdGroupByRating(productId);

        Map<Integer, Integer> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0);
        }
        for (Object[] row : ratingCounts) {
            Integer star = (Integer) row[0];
            Long count = (Long) row[1];
            distribution.put(star, count.intValue());
        }

        ReviewDto.ReviewSummary summary = new ReviewDto.ReviewSummary();
        summary.setProductId(productId);
        summary.setAverageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        summary.setTotalReviews(totalReviews != null ? totalReviews : 0);
        summary.setRatingDistribution(distribution);
        return summary;
    }

    @Transactional(readOnly = true)
    public Page<ReviewDto.Response> getMyReviews(String username, Pageable pageable) {
        UserClientDto.UserResponse user = findUser(username);
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable).map(this::mapToResponse);
    }

    public ReviewDto.Response createReview(ReviewDto.CreateRequest request, String username) {
        UserClientDto.UserResponse user = findUser(username);
        validateProductExists(request.getProductId());

        Review review = new Review();
        review.setProductId(request.getProductId());
        review.setUserId(user.getId());
        review.setRating(request.getRating());
        review.setTitle(request.getTitle());
        review.setContent(request.getContent());
        review.setPros(request.getPros());
        review.setCons(request.getCons());
        // DB default is_approved = 0 — review mới chờ admin duyệt trước khi hiển thị public
        review.setIsApproved(false);
        review.setIsVerifiedPurchase(false);
        review.setHelpfulCount(0);

        if (request.getVariantId() != null) {
            try {
                catalogClient.getVariantById(request.getVariantId());
                review.setVariantId(request.getVariantId());
            } catch (Exception ignored) {
            }
        }

        if (request.getOrderId() != null) {
            review.setOrderId(request.getOrderId());
            try {
                OrderClient.VerifiedPurchaseResponse verified = orderClient.verifiedPurchase(
                        user.getId(), request.getProductId());
                if (verified.isVerified() && request.getOrderId().equals(verified.getOrderId())) {
                    review.setIsVerifiedPurchase(true);
                }
            } catch (Exception ignored) {
            }
        } else {
            try {
                OrderClient.VerifiedPurchaseResponse verified = orderClient.verifiedPurchase(
                        user.getId(), request.getProductId());
                if (verified.isVerified()) {
                    review.setOrderId(verified.getOrderId());
                    review.setIsVerifiedPurchase(true);
                }
            } catch (Exception ignored) {
            }
        }

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            List<ReviewImage> reviewImages = request.getImages().stream()
                    .filter(url -> url != null && !url.trim().isEmpty())
                    .map(url -> {
                        ReviewImage img = new ReviewImage();
                        img.setImageUrl(url);
                        img.setReview(review);
                        return img;
                    }).collect(Collectors.toList());
            review.setReviewImages(reviewImages);
        }

        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    public ReviewDto.Response updateReview(Integer reviewId, ReviewDto.UpdateRequest request, String username) {
        UserClientDto.UserResponse user = findUser(username);

        Review review = reviewRepository.findByIdAndUserId(reviewId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        review.setRating(request.getRating());
        review.setTitle(request.getTitle());
        review.setContent(request.getContent());
        review.setPros(request.getPros());
        review.setCons(request.getCons());
        // Chỉnh sửa nội dung → duyệt lại (is_approved = 0 theo nghiệp vụ moderation)
        review.setIsApproved(false);

        if (request.getImages() != null) {
            if (review.getReviewImages() == null) {
                review.setReviewImages(new ArrayList<>());
            } else {
                review.getReviewImages().clear();
            }
            List<ReviewImage> newImages = request.getImages().stream()
                    .filter(url -> url != null && !url.trim().isEmpty())
                    .map(url -> {
                        ReviewImage img = new ReviewImage();
                        img.setImageUrl(url);
                        img.setReview(review);
                        return img;
                    }).collect(Collectors.toList());
            review.getReviewImages().addAll(newImages);
        }

        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    public void deleteReview(Integer reviewId, String username) {
        UserClientDto.UserResponse user = findUser(username);

        Review review = reviewRepository.findByIdAndUserId(reviewId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        reviewRepository.delete(review);
    }

    public ReviewDto.Response markHelpful(Integer reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        review.setHelpfulCount(review.getHelpfulCount() + 1);
        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<ReviewDto.Response> adminGetAllReviews(Pageable pageable) {
        return reviewRepository.findAll(pageable).map(this::mapToResponse);
    }

    public ReviewDto.Response adminUpdateStatus(Integer reviewId, ReviewDto.AdminUpdateStatusRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        review.setIsApproved(request.getIsApproved());
        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    public ReviewDto.Response adminReply(Integer reviewId, ReviewDto.AdminReplyRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        review.setReplyContent(request.getReplyContent());
        review.setRepliedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    public void adminDeleteReview(Integer reviewId) {
        if (!reviewRepository.existsById(reviewId)) {
            throw new ResourceNotFoundException("Review", "id", reviewId);
        }
        reviewRepository.deleteById(reviewId);
    }

    private void validateProductExists(Integer productId) {
        try {
            catalogClient.getProductById(productId);
        } catch (Exception e) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }
    }

    private UserClientDto.UserResponse findUser(String username) {
        try {
            return userClient.getUserByUsername(username);
        } catch (Exception e) {
            throw new ResourceNotFoundException("User", "username", username);
        }
    }

    private ReviewDto.Response mapToResponse(Review review) {
        ReviewDto.Response response = new ReviewDto.Response();
        response.setId(review.getId());
        response.setProductId(review.getProductId());
        response.setVariantId(review.getVariantId());
        response.setRating(review.getRating());
        response.setTitle(review.getTitle());
        response.setContent(review.getContent());
        response.setPros(review.getPros());
        response.setCons(review.getCons());
        response.setIsVerifiedPurchase(review.getIsVerifiedPurchase());
        response.setIsApproved(review.getIsApproved());
        response.setHelpfulCount(review.getHelpfulCount());
        response.setCreatedAt(review.getCreatedAt());
        response.setUpdatedAt(review.getUpdatedAt());
        response.setReplyContent(review.getReplyContent());
        response.setRepliedAt(review.getRepliedAt());

        if (review.getProductId() != null) {
            try {
                CatalogClientDto.ProductResponse product = catalogClient.getProductById(review.getProductId());
                response.setProductName(product.getName());
            } catch (Exception ignored) {
            }
        }

        if (review.getVariantId() != null) {
            try {
                CatalogClientDto.VariantResponse variant = catalogClient.getVariantById(review.getVariantId());
                response.setVariantName(variant.getVariantName());
            } catch (Exception ignored) {
            }
        }

        if (review.getUserId() != null) {
            ReviewDto.ReviewUserDto userDto = new ReviewDto.ReviewUserDto();
            userDto.setId(review.getUserId());
            try {
                UserClientDto.UserResponse user = userClient.getUserById(review.getUserId());
                userDto.setUsername(user.getUsername());
                userDto.setName(user.getName());
            } catch (Exception ignored) {
            }
            response.setUser(userDto);
        }

        List<ReviewImage> imgs = review.getReviewImages();
        if (imgs != null && !imgs.isEmpty()) {
            response.setImages(imgs.stream().map(ReviewImage::getImageUrl).collect(Collectors.toList()));
        } else {
            response.setImages(Collections.emptyList());
        }

        return response;
    }
}
