package com.electro.order.repository;

import com.electro.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {

    Optional<Order> findByOrderCode(String orderCode);

    // Danh sách đơn hàng hiển thị (chưa bị ẩn)
    @Query("SELECT o FROM Order o WHERE o.isHidden = false")
    Page<Order> findAllActive(Pageable pageable);

    // Danh sách đơn hàng đã bị ẩn (admin xem riêng)
    @Query("SELECT o FROM Order o WHERE o.isHidden = true")
    Page<Order> findHiddenOrders(Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.isHidden = true")
    Long countHiddenOrders();

    @Query("SELECT o FROM Order o WHERE o.userId = :userId AND o.isHidden = false ORDER BY o.orderDate DESC")
    Page<Order> findByUserId(@Param("userId") Integer userId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.isHidden = false")
    Page<Order> findByStatus(@Param("status") Order.OrderStatus status, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE " +
           "o.orderDate BETWEEN :startDate AND :endDate")
    Page<Order> findByOrderDateBetween(@Param("startDate") LocalDateTime startDate,
                                     @Param("endDate") LocalDateTime endDate,
                                     Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.userId = :userId AND o.status = :status")
    Page<Order> findByUserIdAndStatus(@Param("userId") Integer userId,
                                    @Param("status") Order.OrderStatus status,
                                    Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    Long countByStatus(@Param("status") Order.OrderStatus status);

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE " +
           "o.status = 'DELIVERED' AND o.orderDate BETWEEN :startDate AND :endDate")
    Double getTotalRevenueByDateRange(@Param("startDate") LocalDateTime startDate,
                                    @Param("endDate") LocalDateTime endDate);

    @Query("SELECT o FROM Order o WHERE o.orderCode LIKE %:keyword% AND o.isHidden = false")
    Page<Order> searchOrders(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.orderCode LIKE %:keyword% AND o.status = :status AND o.isHidden = false")
    Page<Order> searchOrdersByKeywordAndStatus(@Param("keyword") String keyword,
                                               @Param("status") Order.OrderStatus status,
                                               Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // ██  PHASE 6: STATISTICS QUERIES                                         ██
    // ═══════════════════════════════════════════════════════════════════════════

    // ── API 1: Overview KPIs ────────────────────────────────────────────────

    /** Tổng doanh thu (đơn DELIVERED + COMPLETED) */
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN :statuses")
    java.math.BigDecimal sumRevenueCompleted(@Param("statuses") List<Order.OrderStatus> statuses);

    /** Tổng đơn hàng (trừ CANCELLED) */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status <> :excludedStatus")
    Long countActiveOrders(@Param("excludedStatus") Order.OrderStatus excludedStatus);

    /** Tổng khách hàng đã mua (DISTINCT user_id) */
    @Query("SELECT COUNT(DISTINCT o.userId) FROM Order o WHERE o.status <> :excludedStatus")
    Long countDistinctCustomers(@Param("excludedStatus") Order.OrderStatus excludedStatus);

    /** Doanh thu trong khoảng thời gian (cho Growth %) */
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.status IN :statuses " +
           "AND o.orderDate BETWEEN :start AND :end")
    java.math.BigDecimal sumRevenueByDateRange(@Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end,
                                               @Param("statuses") List<Order.OrderStatus> statuses);

    /** Số đơn hàng trong khoảng thời gian (cho Growth %) */
    @Query("SELECT COUNT(o) FROM Order o " +
           "WHERE o.status <> :excludedStatus " +
           "AND o.orderDate BETWEEN :start AND :end")
    Long countOrdersByDateRange(@Param("start") LocalDateTime start,
                                @Param("end") LocalDateTime end,
                                @Param("excludedStatus") Order.OrderStatus excludedStatus);

    /** Số khách hàng mới trong khoảng thời gian */
    @Query("SELECT COUNT(DISTINCT o.userId) FROM Order o " +
           "WHERE o.status <> :excludedStatus " +
           "AND o.orderDate BETWEEN :start AND :end")
    Long countDistinctCustomersByDateRange(@Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end,
                                           @Param("excludedStatus") Order.OrderStatus excludedStatus);

    // ── API 2: Revenue Chart ────────────────────────────────────────────────

    /** Doanh thu theo NGÀY */
    @Query("SELECT CAST(o.orderDate AS date), SUM(o.totalAmount), COUNT(o) " +
           "FROM Order o " +
           "WHERE o.status IN :statuses " +
           "AND o.orderDate BETWEEN :start AND :end " +
           "GROUP BY CAST(o.orderDate AS date) " +
           "ORDER BY CAST(o.orderDate AS date)")
    List<Object[]> getRevenueByDay(@Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end,
                                   @Param("statuses") List<Order.OrderStatus> statuses);

    /** Doanh thu theo THÁNG */
    @Query("SELECT YEAR(o.orderDate), MONTH(o.orderDate), SUM(o.totalAmount), COUNT(o) " +
           "FROM Order o " +
           "WHERE o.status IN :statuses " +
           "AND o.orderDate BETWEEN :start AND :end " +
           "GROUP BY YEAR(o.orderDate), MONTH(o.orderDate) " +
           "ORDER BY YEAR(o.orderDate), MONTH(o.orderDate)")
    List<Object[]> getRevenueByMonth(@Param("start") LocalDateTime start,
                                     @Param("end") LocalDateTime end,
                                     @Param("statuses") List<Order.OrderStatus> statuses);

    /** Doanh thu theo NĂM */
    @Query("SELECT YEAR(o.orderDate), SUM(o.totalAmount), COUNT(o) " +
           "FROM Order o " +
           "WHERE o.status IN :statuses " +
           "GROUP BY YEAR(o.orderDate) ORDER BY YEAR(o.orderDate)")
    List<Object[]> getRevenueByYear(@Param("statuses") List<Order.OrderStatus> statuses);

    // ── API 3: Order Status Distribution ────────────────────────────────────

    /** Số lượng đơn hàng theo từng trạng thái */
    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> countOrdersByEachStatus();

    // ── API 5: Recent Orders ────────────────────────────────────────────────

    /** 10 đơn hàng gần nhất */
    @Query("SELECT o FROM Order o ORDER BY o.orderDate DESC")
    List<Order> findRecentOrders(Pageable pageable);

    // ── API 6: Payment Method Stats ─────────────────────────────────────────

    /** Thống kê theo phương thức thanh toán */
    @Query("SELECT o.paymentMethod, COUNT(o), COALESCE(SUM(o.totalAmount), 0) " +
           "FROM Order o " +
           "WHERE o.status <> :excludedStatus " +
           "GROUP BY o.paymentMethod ORDER BY COUNT(o) DESC")
    List<Object[]> getPaymentMethodStats(@Param("excludedStatus") Order.OrderStatus excludedStatus);

    @Query("SELECT o FROM Order o WHERE o.assignedSalesUserId = :salesId "
            + "AND o.orderDate BETWEEN :start AND :end")
    List<Order> findByAssignedSalesUserIdAndOrderDateBetween(
            @Param("salesId") Integer salesId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT o FROM Order o WHERE o.isHidden = false AND o.assignedSalesUserId = :salesId "
            + "ORDER BY o.orderDate DESC")
    List<Order> findByAssignedSalesUserIdAndIsHiddenFalseOrderByOrderDateDesc(@Param("salesId") Integer salesId);

    @Query("SELECT o FROM Order o WHERE o.isHidden = false AND o.assignedSalesUserId IS NOT NULL "
            + "ORDER BY o.orderDate DESC")
    List<Order> findByIsHiddenFalseAndAssignedSalesUserIdIsNotNullOrderByOrderDateDesc();

    @Query("SELECT o FROM Order o WHERE o.isHidden = false "
            + "AND (:assignedSalesUserId IS NULL OR o.assignedSalesUserId = :assignedSalesUserId) "
            + "AND (:status IS NULL OR o.status = :status) "
            + "AND (:keyword IS NULL OR :keyword = '' OR o.orderCode LIKE CONCAT('%', :keyword, '%'))")
    Page<Order> adminFilterOrders(
            @Param("assignedSalesUserId") Integer assignedSalesUserId,
            @Param("status") Order.OrderStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);
}
