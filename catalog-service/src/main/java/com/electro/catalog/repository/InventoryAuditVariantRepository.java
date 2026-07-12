package com.electro.catalog.repository;

import com.electro.catalog.entity.InventoryAuditVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryAuditVariantRepository extends JpaRepository<InventoryAuditVariant, Integer> {

    List<InventoryAuditVariant> findByAuditIdOrderByProductNameAsc(Integer auditId);

    Optional<InventoryAuditVariant> findByAuditIdAndVariantId(Integer auditId, Integer variantId);
}
