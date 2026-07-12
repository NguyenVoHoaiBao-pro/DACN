package com.electro.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refund_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "refund_code", nullable = false, unique = true, length = 30)
    private String refundCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private RefundStatus status = RefundStatus.PENDING_APPROVAL;

    @Column(name = "order_id", nullable = false)
    private Integer orderId;

    @Column(name = "order_code", nullable = false, length = 50)
    private String orderCode;

    @Column(name = "return_slip_id")
    private Integer returnSlipId;

    @Column(name = "return_slip_code", length = 30)
    private String returnSlipCode;

    @Column(name = "warranty_claim_id")
    private Integer warrantyClaimId;

    @Column(name = "warranty_claim_code", length = 50)
    private String warrantyClaimCode;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "customer_phone", length = 30)
    private String customerPhone;

    @Column(name = "product_name", length = 300)
    private String productName;

    @Column(name = "refund_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "coupon_allocated_discount", precision = 15, scale = 2)
    private BigDecimal couponAllocatedDiscount;

    @Column(name = "shipping_excluded_amount", precision = 15, scale = 2)
    private BigDecimal shippingExcludedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private Order.PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_channel", nullable = false, length = 30)
    private RefundChannel refundChannel;

    @Column(name = "is_defective")
    private Boolean isDefective;

    @Column(name = "defective_reason", length = 40)
    private String defectiveReason;

    @Column(name = "return_reason", columnDefinition = "TEXT")
    private String returnReason;

    @Column(name = "voucher_code", length = 30)
    private String voucherCode;

    @Column(name = "customer_bank_name", length = 100)
    private String customerBankName;

    @Column(name = "customer_bank_account", length = 50)
    private String customerBankAccount;

    @Column(name = "customer_bank_account_name", length = 200)
    private String customerBankAccountName;

    @Column(name = "bank_info_saved_by", length = 100)
    private String bankInfoSavedBy;

    @Column(name = "bank_info_saved_at")
    private LocalDateTime bankInfoSavedAt;

    @Column(name = "gateway_refund_id", length = 100)
    private String gatewayRefundId;

    @Column(name = "gateway_response", columnDefinition = "TEXT")
    private String gatewayResponse;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by", length = 100)
    private String rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "transfer_reference", length = 100)
    private String transferReference;

    @Column(name = "receipt_image_url", length = 500)
    private String receiptImageUrl;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum RefundStatus {
        PENDING_APPROVAL,
        REJECTED,
        AWAITING_MANUAL_TRANSFER,
        PROCESSING,
        COMPLETED,
        FAILED
    }

    public enum RefundChannel {
        GATEWAY,
        COD_MANUAL,
        BANK_TRANSFER_MANUAL
    }
}
