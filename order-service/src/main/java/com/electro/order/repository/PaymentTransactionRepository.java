package com.electro.order.repository;

import com.electro.order.entity.PaymentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Integer> {

    Optional<PaymentTransaction> findByTransactionRef(String transactionRef);

    List<PaymentTransaction> findByOrderCodeOrderByCreatedAtDesc(String orderCode);

    @Query("SELECT pt FROM PaymentTransaction pt WHERE pt.order.id = :orderId ORDER BY pt.createdAt DESC")
    List<PaymentTransaction> findByOrderId(@Param("orderId") Integer orderId);

    List<PaymentTransaction> findByOrderCodeAndStatus(String orderCode, PaymentTransaction.TransactionStatus status);

    Optional<PaymentTransaction> findFirstByOrderCodeAndStatusOrderByCreatedAtDesc(String orderCode, PaymentTransaction.TransactionStatus status);

    Page<PaymentTransaction> findAll(Pageable pageable);

    @Query("""
            SELECT pt FROM PaymentTransaction pt
            WHERE pt.createdAt BETWEEN :start AND :end
            ORDER BY pt.createdAt DESC""")
    Page<PaymentTransaction> findByCreatedAtBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(pt.amount), 0) FROM PaymentTransaction pt
            WHERE pt.status = :status AND pt.createdAt BETWEEN :start AND :end""")
    BigDecimal sumAmountByStatusAndDateRange(
            @Param("status") PaymentTransaction.TransactionStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
