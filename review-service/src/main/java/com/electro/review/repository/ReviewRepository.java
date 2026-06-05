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

    // ─── Internal API queries ───────────────────────────────────────────────

    List<Review> findByUserIdAndIsApprovedOrderByCreatedAtDesc(Integer userId, Boolean isApproved, Pageable pageable);

    @Query("SELECT DISTINCT r.productId FROM Review r WHERE r.userId = :userId AND r.isApproved = true AND r.productId IS NOT NULL")
    List<Integer> findApprovedProductIdsByUserId(@Param("userId") Integer userId);

    List<Review> findAllByIsApproved(Boolean isApproved);

    @Query("SELECT r.productId, AVG(r.rating), COUNT(r) FROM Review r " +
            "WHERE r.isApproved = true AND r.productId IS NOT NULL " +
            "GROUP BY r.productId HAVING COUNT(r) >= 1 " +
            "ORDER BY AVG(r.rating) DESC, COUNT(r) DESC")
    List<Object[]> findPopularProducts(Pageable pageable);
}
