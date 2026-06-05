package com.electro.order.repository;

import com.electro.order.entity.WarrantyClaim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, Integer> {

    Optional<WarrantyClaim> findByClaimNumber(String claimNumber);

    @Query("""
            SELECT c FROM WarrantyClaim c
            WHERE c.status = :status
            AND (
                LOWER(TRIM(c.claimNumber)) = LOWER(:kw)
                OR LOWER(TRIM(c.returnTrackingCode)) = LOWER(:kw)
                OR LOWER(REPLACE(TRIM(c.claimNumber), '#', '')) = LOWER(:kw)
                OR LOWER(REPLACE(TRIM(c.returnTrackingCode), '#', '')) = LOWER(:kw)
            )
            """)
    Optional<WarrantyClaim> findApprovedByInboundKeyword(
            @Param("kw") String kw,
            @Param("status") WarrantyClaim.ClaimStatus status);

    @Query("SELECT MAX(c.claimNumber) FROM WarrantyClaim c WHERE c.claimNumber LIKE CONCAT(:prefix, '%')")
    String findMaxClaimNumberWithPrefix(@Param("prefix") String prefix);

    @Query("""
            SELECT c FROM WarrantyClaim c
            WHERE (:status IS NULL OR c.status = :status)
            AND (
                :keyword IS NULL OR :keyword = ''
                OR LOWER(c.claimNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.contactName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.contactPhone) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.productName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.imei) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.returnTrackingCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.returnCarrier) LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
            ORDER BY c.createdAt DESC
            """)
    Page<WarrantyClaim> searchClaims(
            @Param("keyword") String keyword,
            @Param("status") WarrantyClaim.ClaimStatus status,
            Pageable pageable);

    Page<WarrantyClaim> findByUserIdOrderByCreatedAtDesc(Integer userId, Pageable pageable);
}
