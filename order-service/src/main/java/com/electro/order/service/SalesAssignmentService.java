package com.electro.order.service;

import com.electro.order.client.UserClient;
import com.electro.order.dto.UserDto;
import com.electro.order.entity.Order;
import com.electro.order.exception.BadRequestException;
import com.electro.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class SalesAssignmentService {

    private static final Logger log = LoggerFactory.getLogger(SalesAssignmentService.class);

    private final UserClient userClient;
    private final OrderRepository orderRepository;

    @Transactional
    public void assignOnNewOrder(Order order) {
        assignOnNewOrder(order, null);
    }

    @Transactional
    public void assignOnNewOrder(Order order, Integer salesRefUserId) {
        if (order.getAssignedSalesUserId() != null) {
            return;
        }

        if (salesRefUserId != null) {
            assignToSales(order, salesRefUserId, Order.OrderSource.SALES_LINK);
            return;
        }

        try {
            Map<String, Object> payload = userClient.getNextSalesAssignee();
            Object idObj = payload != null ? payload.get("salesUserId") : null;
            if (idObj instanceof Number n) {
                assignToSales(order, n.intValue(), Order.OrderSource.WEB_ASSIGNED);
            } else if (order.getOrderSource() == null) {
                order.setOrderSource(Order.OrderSource.WEB_ORGANIC);
                orderRepository.save(order);
            }
        } catch (Exception e) {
            log.warn("Auto-assign sales failed for order {}: {}", order.getOrderCode(), e.getMessage());
            if (order.getOrderSource() == null) {
                order.setOrderSource(Order.OrderSource.WEB_ORGANIC);
                orderRepository.save(order);
            }
        }
    }

    @Transactional
    public void attributeToSales(Order order, Integer salesUserId, Order.OrderSource source) {
        if (salesUserId == null) {
            throw new BadRequestException("Thiếu nhân viên Sales");
        }
        if (source == null) {
            source = Order.OrderSource.SALES_CHAT;
        }
        assignToSales(order, salesUserId, source);
    }

    private void assignToSales(Order order, Integer salesUserId, Order.OrderSource source) {
        validateSalesUser(salesUserId);
        order.setAssignedSalesUserId(salesUserId);
        order.setOrderSource(source);
        if (order.getSalesPipelineStatus() == null) {
            order.setSalesPipelineStatus(Order.SalesPipelineStatus.NEW_ASSIGNED);
        }
        orderRepository.save(order);
    }

    private void validateSalesUser(Integer salesUserId) {
        try {
            UserDto.Response user = userClient.getUserById(salesUserId);
            if (user == null || user.getId() == null) {
                throw new BadRequestException("Nhân viên Sales không hợp lệ");
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Nhân viên Sales không hợp lệ");
        }
    }
}
