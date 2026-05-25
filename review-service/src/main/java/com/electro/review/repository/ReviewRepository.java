package com.electro.review.repository;

import com.electro.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {

    Page<Review> findByProductIdAndIsApproved(Integer productId, Boolean isApproved, Pageable pageable);

    Page<Review> findByProductIdAndIsApprovedAndRating(Integer productId, Boolean isApproved, Integer rating, Pageable pageable);

    boolean existsByProductIdAndUserId(Integer productId, Integer userId);

    Optional<Review> findByIdAndUserId(Integer id, Integer userId);

    Page<Review> findByUserIdOrderByCreatedAtDesc(Integer userId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.productId = :productId AND r.isApproved = true")
    Double findAverageRatingByProductId(@Param("productId") Integer productId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.productId = :productId AND r.isApproved = true")
    Integer countApprovedByProductId(@Param("productId") Integer productId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.productId = :productId AND r.isApproved = true GROUP BY r.rating")
    List<Object[]> countByProductIdGroupByRating(@Param("productId") Integer productId);
}
