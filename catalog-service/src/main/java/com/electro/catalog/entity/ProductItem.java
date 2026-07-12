package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "imei", unique = true, length = 50)
    private String imei;

    @Column(name = "serial_number", unique = true, length = 100)
    private String serialNumber;

    @Column(name = "batch_number", length = 50)
    private String batchNumber;

    @Column(name = "purchase_order_id")
    private Integer purchaseOrderId;

    @Column(name = "stock_lot_id")
    private Integer stockLotId;

    @Column(name = "location", length = 100)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProductItemStatus status = ProductItemStatus.AVAILABLE;

    @Column(name = "reserved_at")
    private LocalDateTime reservedAt;

    @Column(name = "sold_at")
    private LocalDateTime soldAt;

    @Column(name = "warranty_start_date")
    private LocalDate warrantyStartDate;

    @Column(name = "warranty_months")
    private Integer warrantyMonths = 12;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ProductItemStatus.AVAILABLE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
