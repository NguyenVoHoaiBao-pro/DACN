package com.electro.catalog.repository;

import com.electro.catalog.entity.InventoryAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryAuditRepository extends JpaRepository<InventoryAudit, Integer> {

    Optional<InventoryAudit> findByAuditCode(String auditCode);

    @Query("SELECT a FROM InventoryAudit a LEFT JOIN FETCH a.lines WHERE a.id = :id")
    Optional<InventoryAudit> findByIdWithLines(@Param("id") Integer id);

    @Query("SELECT a FROM InventoryAudit a LEFT JOIN FETCH a.variants WHERE a.id = :id")
    Optional<InventoryAudit> findByIdWithVariants(@Param("id") Integer id);

    @Query("SELECT DISTINCT a FROM InventoryAudit a JOIN a.variants v "
            + "WHERE a.status IN :statuses AND a.stockLocked = true")
    List<InventoryAudit> findActiveLocked(@Param("statuses") List<InventoryAudit.AuditStatus> statuses);
}
