package com.electro.order.controller;

import com.electro.order.entity.Order;
import com.electro.order.repository.OrderDetailRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders/internal")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderDetailRepository orderDetailRepository;

    private static final List<Order.OrderStatus> PURCHASE_STATUSES = List.of(
            Order.OrderStatus.CONFIRMED,
            Order.OrderStatus.PROCESSING,
            Order.OrderStatus.SHIPPING,
            Order.OrderStatus.DELIVERED,
            Order.OrderStatus.COMPLETED
    );

    @GetMapping("/users/{userId}/products/{productId}/verified-purchase")
    public VerifiedPurchaseResponse verifiedPurchase(
            @PathVariable Integer userId,
            @PathVariable Integer productId) {
        boolean verified = orderDetailRepository.existsVerifiedPurchase(userId, productId);
        VerifiedPurchaseResponse response = new VerifiedPurchaseResponse();
        response.setVerified(verified);
        if (verified) {
            List<Integer> orderIds = orderDetailRepository.findVerifiedOrderIds(
                    userId, productId, PageRequest.of(0, 1));
            if (!orderIds.isEmpty()) {
                response.setOrderId(orderIds.get(0));
            }
        }
        return response;
    }

    // ─── GET /api/orders/internal/users/{userId}/purchased-products ─────────
    // Lấy danh sách DISTINCT product_id mà user đã mua (status hợp lệ)
    @GetMapping("/users/{userId}/purchased-products")
    public List<Integer> getUserPurchasedProducts(@PathVariable Integer userId) {
        return orderDetailRepository.findDistinctPurchasedProductIds(userId, PURCHASE_STATUSES);
    }

    // ─── GET /api/orders/internal/all-purchased-products ────────────────────
    // Lấy toàn bộ cặp (user_id, product_id) đã mua (cho training pipeline)
    @GetMapping("/all-purchased-products")
    public List<UserProductPair> getAllPurchasedProducts() {
        List<Object[]> results = orderDetailRepository.findAllPurchasedUserProducts(PURCHASE_STATUSES);
        return results.stream()
                .map(row -> new UserProductPair((Integer) row[0], (Integer) row[1]))
                .collect(Collectors.toList());
    }

    @Data
    public static class VerifiedPurchaseResponse {
        private boolean verified;
        private Integer orderId;
    }

    @Data
    public static class UserProductPair {
        private final Integer userId;
        private final Integer productId;

        public UserProductPair(Integer userId, Integer productId) {
            this.userId = userId;
            this.productId = productId;
        }
    }
}

