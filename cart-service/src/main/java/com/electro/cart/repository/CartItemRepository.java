package com.electro.cart.repository;

import com.electro.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Integer> {

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.userId = :userId")
    List<CartItem> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.userId = :userId AND ci.variantId = :variantId")
    Optional<CartItem> findByUserIdAndVariantId(@Param("userId") Integer userId, @Param("variantId") Integer variantId);

    @Modifying
    @Query("DELETE FROM CartItem ci WHERE ci.cart.userId = :userId")
    void deleteAllByUserId(@Param("userId") Integer userId);

    @Query("SELECT COUNT(ci) FROM CartItem ci WHERE ci.cart.userId = :userId")
    Long countByUserId(@Param("userId") Integer userId);
}
