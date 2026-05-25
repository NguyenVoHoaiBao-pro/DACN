package com.electro.order.repository;

import com.electro.order.entity.WarrantyTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WarrantyTicketRepository extends JpaRepository<WarrantyTicket, Integer> {

    @Query("SELECT MAX(t.ticketCode) FROM WarrantyTicket t WHERE t.ticketCode LIKE :prefix%")
    String findMaxTicketCodeWithPrefix(@Param("prefix") String prefix);

    @Query("SELECT t FROM WarrantyTicket t WHERE " +
            "(:keyword IS NULL OR LOWER(t.ticketCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(t.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(t.customerPhone) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:status IS NULL OR t.status = :status)")
    Page<WarrantyTicket> searchTickets(
            @Param("keyword") String keyword,
            @Param("status") WarrantyTicket.TicketStatus status,
            Pageable pageable);
}
