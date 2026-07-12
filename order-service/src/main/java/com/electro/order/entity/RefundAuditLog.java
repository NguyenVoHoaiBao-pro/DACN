package com.electro.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refund_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundAuditLog {

    public enum Action {
        WAREHOUSE_RETURN_CONFIRMED,
        REFUND_CREATED,
        BANK_INFO_SAVED,
        GATEWAY_BALANCE_CHECKED,
        GATEWAY_REFUND_APPROVED,
        GATEWAY_REFUND_RETRY,
        GATEWAY_REFUND_FAILED,
        COD_REFUND_CONFIRMED,
        REFUND_REJECTED,
        ORDER_CANCEL_REFUND
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "refund_id", nullable = false)
    private Integer refundId;

    @Column(name = "refund_code", nullable = false, length = 30)
    private String refundCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    private Action action;

    @Column(name = "actor_username", nullable = false, length = 100)
    private String actorUsername;

    @Column(name = "actor_role", length = 255)
    private String actorRole;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
