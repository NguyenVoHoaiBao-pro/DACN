package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inventory_audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "audit_code", nullable = false, unique = true, length = 50)
    private String auditCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AuditStatus status = AuditStatus.DRAFT;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_by_user_id")
    private Integer createdByUserId;

    @Column(name = "product_type_id")
    private Integer productTypeId;

    @Column(name = "product_type_name", length = 150)
    private String productTypeName;

    @Column(name = "stock_locked", nullable = false)
    private Boolean stockLocked = false;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_by_user_id")
    private Integer approvedByUserId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "total_scanned")
    private Integer totalScanned = 0;

    @Column(name = "total_matched")
    private Integer totalMatched = 0;

    @Column(name = "total_missing")
    private Integer totalMissing = 0;

    @Column(name = "total_extra")
    private Integer totalExtra = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "audit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InventoryAuditLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "audit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InventoryAuditVariant> variants = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum AuditStatus {
        DRAFT,
        IN_PROGRESS,
        COMPLETED,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED
    }
}
