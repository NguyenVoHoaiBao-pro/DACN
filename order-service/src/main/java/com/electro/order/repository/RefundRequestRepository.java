package com.electro.order.repository;

import com.electro.order.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Integer> {

    List<RefundRequest> findAllByOrderByCreatedAtDesc();

    List<RefundRequest> findByStatusOrderByCreatedAtDesc(RefundRequest.RefundStatus status);

    Optional<RefundRequest> findByReturnSlipId(Integer returnSlipId);

    Optional<RefundRequest> findByWarrantyClaimId(Integer warrantyClaimId);

    Optional<RefundRequest> findByRefundCode(String refundCode);

    List<RefundRequest> findByOrderId(Integer orderId);

    long countByStatusIn(Collection<RefundRequest.RefundStatus> statuses);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(r.refundAmount), 0) FROM RefundRequest r
            WHERE r.status IN :statuses""")
    BigDecimal sumRefundAmountByStatusIn(@org.springframework.data.repository.query.Param("statuses")
                                         Collection<RefundRequest.RefundStatus> statuses);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(r.refundAmount), 0) FROM RefundRequest r
            WHERE r.status = :status AND r.updatedAt BETWEEN :start AND :end""")
    BigDecimal sumRefundAmountByStatusAndDateRange(
            @org.springframework.data.repository.query.Param("status") RefundRequest.RefundStatus status,
            @org.springframework.data.repository.query.Param("start") LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") LocalDateTime end);

    List<RefundRequest> findByStatusInAndUpdatedAtBetweenOrderByUpdatedAtDesc(
            Collection<RefundRequest.RefundStatus> statuses,
            LocalDateTime start,
            LocalDateTime end);
}
