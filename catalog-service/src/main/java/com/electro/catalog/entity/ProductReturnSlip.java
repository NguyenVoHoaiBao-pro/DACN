package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_return_slips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReturnSlip {

    public enum SlipStatus {
        PENDING, PROCESSED
    }

    public enum ConditionType {
        INTACT, DEFECTIVE
    }

    public enum DefectiveReason {
        DEFECTIVE_BY_CARRIER,
        DEFECTIVE_BY_MANUFACTURER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "slip_code", nullable = false, unique = true, length = 30)
    private String slipCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SlipStatus status = SlipStatus.PENDING;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "product_item_id")
    private Integer productItemId;

    @Column(name = "variant_id")
    private Integer variantId;

    @Column(name = "order_id")
    private Integer orderId;

    @Column(name = "order_code", length = 50)
    private String orderCode;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "customer_phone", length = 30)
    private String customerPhone;

    @Column(name = "product_name", length = 300)
    private String productName;

    @Column(name = "sku_code", length = 100)
    private String skuCode;

    @Column(name = "variant_name", length = 150)
    private String variantName;

    @Column(name = "tracking_code", length = 100)
    private String trackingCode;

    @Column(name = "item_status_before", length = 30)
    private String itemStatusBefore;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", length = 20)
    private ConditionType conditionType;

    @Column(name = "is_defective")
    private Boolean isDefective;

    @Enumerated(EnumType.STRING)
    @Column(name = "defective_reason", length = 40)
    private DefectiveReason defectiveReason;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "warehouse_notes", columnDefinition = "TEXT")
    private String warehouseNotes;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "processed_by_user_id")
    private Integer processedByUserId;

    @Column(name = "created_by_user_id")
    private Integer createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
