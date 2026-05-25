package com.electro.user.repository;

import com.electro.user.entity.Wishlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Integer> {

    Page<Wishlist> findByUserId(Integer userId, Pageable pageable);

    Optional<Wishlist> findByUserIdAndProductIdAndVariantId(Integer userId, Integer productId, Integer variantId);

    Optional<Wishlist> findByUserIdAndProductIdAndVariantIdIsNull(Integer userId, Integer productId);

    Optional<Wishlist> findByUserIdAndProductId(Integer userId, Integer productId);

    boolean existsByUserIdAndProductId(Integer userId, Integer productId);

    void deleteByUserId(Integer userId);
}
