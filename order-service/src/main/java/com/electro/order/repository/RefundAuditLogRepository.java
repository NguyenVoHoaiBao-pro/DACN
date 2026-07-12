package com.electro.order.repository;

import com.electro.order.entity.RefundAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundAuditLogRepository extends JpaRepository<RefundAuditLog, Integer> {

    List<RefundAuditLog> findByRefundIdOrderByCreatedAtAsc(Integer refundId);
}
