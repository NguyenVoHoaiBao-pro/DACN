package com.electro.catalog.repository;

import com.electro.catalog.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Integer> {
    Optional<PurchaseOrder> findByPoNumber(String poNumber);

    @Query("SELECT DISTINCT po FROM PurchaseOrder po LEFT JOIN FETCH po.items "
            + "WHERE po.status IN :statuses "
            + "AND (:keyword IS NULL OR :keyword = '' OR LOWER(po.poNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
            + "ORDER BY po.expectedDate ASC, po.id DESC")
    List<PurchaseOrder> findWarehouseQueue(
            @Param("statuses") List<PurchaseOrder.PurchaseOrderStatus> statuses,
            @Param("keyword") String keyword);

    @Query("SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.items WHERE po.id = :id")
    Optional<PurchaseOrder> findByIdWithItems(@Param("id") Integer id);

    List<PurchaseOrder> findByStatusOrderByOrderDateDesc(PurchaseOrder.PurchaseOrderStatus status);

    @Query("SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.items "
            + "WHERE po.status IN :statuses ORDER BY po.orderDate DESC")
    List<PurchaseOrder> findByStatusInWithItems(@Param("statuses") List<PurchaseOrder.PurchaseOrderStatus> statuses);
}
