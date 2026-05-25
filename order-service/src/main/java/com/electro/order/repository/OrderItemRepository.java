package com.electro.order.repository;

import com.electro.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    List<OrderItem> findByOrderDetailId(Integer orderDetailId);

    @Query("SELECT oi FROM OrderItem oi WHERE oi.orderDetail.order.id = :orderId")
    List<OrderItem> findByOrderId(@Param("orderId") Integer orderId);

    @Query("SELECT COUNT(oi) FROM OrderItem oi WHERE oi.orderDetail.id = :orderDetailId")
    long countByOrderDetailId(@Param("orderDetailId") Integer orderDetailId);
}
