package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_audit_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAuditLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_id", nullable = false)
    private InventoryAudit audit;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "variant_id")
    private Integer variantId;

    @Column(name = "product_item_id")
    private Integer productItemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_result", nullable = false, length = 20)
    private ScanResult scanResult;

    @Column(name = "system_status", length = 30)
    private String systemStatus;

    @Column(name = "scanned_at")
    private LocalDateTime scannedAt;

    @PrePersist
    protected void onCreate() {
        if (scannedAt == null) {
            scannedAt = LocalDateTime.now();
        }
    }

    public enum ScanResult {
        MATCH, MISSING, EXTRA
    }
}
