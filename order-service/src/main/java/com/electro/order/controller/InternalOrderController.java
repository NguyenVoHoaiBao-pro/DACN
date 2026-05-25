package com.electro.order.controller;

import com.electro.order.repository.OrderDetailRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders/internal")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderDetailRepository orderDetailRepository;

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

    @Data
    public static class VerifiedPurchaseResponse {
        private boolean verified;
        private Integer orderId;
    }
}
