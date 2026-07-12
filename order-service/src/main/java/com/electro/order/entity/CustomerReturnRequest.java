package com.electro.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_return_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerReturnRequest {

    public enum RequestStatus {
        PENDING_SALES_REVIEW,
        APPROVED,
        REJECTED,
        SHIPPED_BY_CUSTOMER,
        RECEIVED_AT_WAREHOUSE,
        CANCELLED,
        EXPIRED
    }

    public enum ReasonType {
        CHANGE_OF_MIND,
        WRONG_PRODUCT,
        COLOR_ISSUE,
        MINOR_DAMAGE,
        MISSING_ACCESSORY,
        OTHER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "request_code", nullable = false, unique = true, length = 30)
    private String requestCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private RequestStatus status = RequestStatus.PENDING_SALES_REVIEW;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "order_id", nullable = false)
    private Integer orderId;

    @Column(name = "order_code", nullable = false, length = 50)
    private String orderCode;

    @Column(name = "order_item_id")
    private Integer orderItemId;

    @Column(name = "order_detail_id")
    private Integer orderDetailId;

    @Column(name = "product_item_id")
    private Integer productItemId;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "product_name", length = 300)
    private String productName;

    @Column(name = "sku_code", length = 100)
    private String skuCode;

    @Column(name = "variant_name", length = 150)
    private String variantName;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false, length = 40)
    private ReasonType reasonType;

    @Column(name = "reason_detail", columnDefinition = "TEXT")
    private String reasonDetail;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "customer_phone", length = 30)
    private String customerPhone;

    @Column(name = "reviewed_by_user_id")
    private Integer reviewedByUserId;

    @Column(name = "reviewed_by_username", length = 100)
    private String reviewedByUsername;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "sales_response_note", columnDefinition = "TEXT")
    private String salesResponseNote;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "ship_deadline")
    private LocalDateTime shipDeadline;

    @Column(name = "customer_shipped_at")
    private LocalDateTime customerShippedAt;

    @Column(name = "customer_return_tracking", length = 100)
    private String customerReturnTracking;

    @Column(name = "return_slip_id")
    private Integer returnSlipId;

    @Column(name = "return_slip_code", length = 30)
    private String returnSlipCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
