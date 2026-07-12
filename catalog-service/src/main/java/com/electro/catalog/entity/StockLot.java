package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_lots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "lot_number", nullable = false, unique = true, length = 50)
    private String lotNumber;

    @Column(name = "purchase_order_id", nullable = false)
    private Integer purchaseOrderId;

    @Column(name = "receive_wave", nullable = false)
    private Integer receiveWave = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private StockLotStatus status = StockLotStatus.OPEN;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @Column(name = "received_by_user_id")
    private Integer receivedByUserId;

    @Column(name = "expected_quantity", nullable = false)
    private Integer expectedQuantity = 0;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
    }

    public enum StockLotStatus {
        OPEN, CLOSED, RECALL
    }
}
