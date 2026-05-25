package com.electro.statistics.repository;

import com.electro.statistics.entity.UserInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserInteractionRepository extends JpaRepository<UserInteraction, Long> {
    Optional<UserInteraction> findByUserIdAndProductIdAndActionType(
            Integer userId, Integer productId, String actionType);

    @Query("SELECT u.productId, " +
            "SUM(CASE WHEN u.actionType = 'VIEW' THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN u.actionType = 'PURCHASE' THEN 1 ELSE 0 END) " +
            "FROM UserInteraction u GROUP BY u.productId")
    List<Object[]> countViewsAndPurchasesByProduct();
}
