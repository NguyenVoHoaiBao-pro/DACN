package com.electro.order.repository;

import com.electro.order.entity.Order;
import com.electro.order.entity.OrderDetail;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface OrderDetailRepository extends JpaRepository<OrderDetail, Integer> {

    List<OrderDetail> findByOrderId(Integer orderId);

    @Query("SELECT od FROM OrderDetail od WHERE od.order.id IN :orderIds")
    List<OrderDetail> findByOrderIds(@Param("orderIds") Collection<Integer> orderIds);

    @Query("SELECT COALESCE(SUM(od.quantity), 0) FROM OrderDetail od WHERE od.productId = :productId")
    Long sumQuantityByProductId(@Param("productId") Integer productId);

    @Query("SELECT COALESCE(SUM(od.quantity), 0) FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses")
    Long sumTotalProductsSold(@Param("statuses") List<Order.OrderStatus> statuses);

    @Query("SELECT od.productId, od.productName, od.variantName, " +
            "SUM(od.quantity), SUM(od.totalPrice) " +
            "FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses AND od.productId IS NOT NULL " +
            "GROUP BY od.productId, od.productName, od.variantName " +
            "ORDER BY SUM(od.quantity) DESC")
    List<Object[]> findTopSellingProducts(@Param("statuses") List<Order.OrderStatus> statuses, Pageable pageable);

    @Query("SELECT od.productId, SUM(od.quantity), SUM(od.totalPrice) " +
            "FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses AND od.productId IS NOT NULL " +
            "GROUP BY od.productId " +
            "ORDER BY SUM(od.quantity) DESC")
    List<Object[]> findTopSellingProductsByProductId(
            @Param("statuses") List<Order.OrderStatus> statuses, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT od.productId) FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses AND od.productId IS NOT NULL")
    long countDistinctSoldProducts(@Param("statuses") List<Order.OrderStatus> statuses);

    @Query("SELECT od.productId, COALESCE(SUM(od.quantity), 0) FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses AND od.productId IN :productIds " +
            "GROUP BY od.productId")
    List<Object[]> sumQuantityByProductIds(
            @Param("statuses") List<Order.OrderStatus> statuses,
            @Param("productIds") Collection<Integer> productIds);

    @Query("SELECT CASE WHEN COUNT(od) > 0 THEN true ELSE false END FROM OrderDetail od JOIN od.order o " +
            "WHERE o.userId = :userId AND od.productId = :productId " +
            "AND o.status IN ('DELIVERED', 'COMPLETED')")
    boolean existsVerifiedPurchase(@Param("userId") Integer userId, @Param("productId") Integer productId);

    @Query("SELECT o.id FROM Order o JOIN o.orderDetails od " +
            "WHERE o.userId = :userId AND od.productId = :productId " +
            "AND o.status IN ('DELIVERED', 'COMPLETED') ORDER BY o.deliveredAt DESC")
    List<Integer> findVerifiedOrderIds(@Param("userId") Integer userId, @Param("productId") Integer productId, Pageable pageable);

    // ─── Internal API queries ───────────────────────────────────────────────

    @Query("SELECT DISTINCT od.productId FROM OrderDetail od JOIN od.order o " +
            "WHERE o.userId = :userId AND o.status IN :statuses AND od.productId IS NOT NULL")
    List<Integer> findDistinctPurchasedProductIds(
            @Param("userId") Integer userId,
            @Param("statuses") List<Order.OrderStatus> statuses);

    @Query("SELECT DISTINCT o.userId, od.productId FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses AND o.userId IS NOT NULL AND od.productId IS NOT NULL")
    List<Object[]> findAllPurchasedUserProducts(@Param("statuses") List<Order.OrderStatus> statuses);

    @Query("SELECT od.productId, SUM(od.totalPrice), SUM(od.quantity) " +
            "FROM OrderDetail od JOIN od.order o " +
            "WHERE o.status IN :statuses AND od.productId IS NOT NULL " +
            "AND o.orderDate BETWEEN :start AND :end " +
            "GROUP BY od.productId")
    List<Object[]> findRevenueByProductInDateRange(
            @Param("statuses") List<Order.OrderStatus> statuses,
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end);
}
