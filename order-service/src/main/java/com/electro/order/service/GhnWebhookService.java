package com.electro.order.service;

import com.electro.order.dto.GHNDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * Điều phối webhook GHN — luồng thuận (đơn bán ORD-...) và ngược (thu hồi BH BH-/WC-...).
 */
@Service
public class GhnWebhookService {

    private static final Logger log = LoggerFactory.getLogger(GhnWebhookService.class);

    @Autowired
    @Lazy
    private OrderService orderService;

    @Autowired
    @Lazy
    private WarrantyClaimService warrantyClaimService;

    public void process(GHNDto.WebhookCallbackRequest payload) {
        if (payload == null || payload.getStatus() == null || payload.getStatus().isBlank()) {
            log.warn("GHN webhook ignored: empty status");
            return;
        }
        log.info("GHN webhook received: ghnCode={}, clientCode={}, status={}",
                payload.getOrderCode(), payload.getClientOrderCode(), payload.getStatus());

        if (orderService.applyGhnWebhookStatus(payload)) {
            return;
        }
        if (warrantyClaimService.applyGhnWebhookStatus(payload)) {
            return;
        }
        log.warn("GHN webhook: không tìm thấy đơn hoặc phiếu BH (ghn={}, client={})",
                payload.getOrderCode(), payload.getClientOrderCode());
    }
}
