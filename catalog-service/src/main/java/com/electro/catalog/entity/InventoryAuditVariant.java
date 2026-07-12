package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_audit_variants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAuditVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_id", nullable = false)
    private InventoryAudit audit;

    @Column(name = "variant_id", nullable = false)
    private Integer variantId;

    @Column(name = "product_name", length = 255)
    private String productName;

    @Column(name = "sku_code", length = 100)
    private String skuCode;

    @Column(name = "variant_name", length = 255)
    private String variantName;

    @Column(name = "system_qty", nullable = false)
    private Integer systemQty = 0;

    @Column(name = "actual_qty", nullable = false)
    private Integer actualQty = 0;

    @Column(name = "variance", nullable = false)
    private Integer variance = 0;
}
