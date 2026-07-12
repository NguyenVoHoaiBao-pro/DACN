package com.electro.catalog.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "order-service", contextId = "orderRefundClient", path = "/api/orders/internal/refunds")
public interface OrderRefundClient {

    @PostMapping("/from-return")
    RefundDetailResponse createFromReturn(@RequestBody CreateFromReturnRequest request);

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    class CreateFromReturnRequest {
        private Integer returnSlipId;
        private String returnSlipCode;
        private Integer orderId;
        private String orderCode;
        private String serialNumber;
        private String customerName;
        private String customerPhone;
        private String productName;
        private Boolean isDefective;
        private String defectiveReason;
        private String returnReason;
        private String warehouseProcessedBy;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    class RefundDetailResponse {
        private Integer id;
        private String refundCode;
        private String status;
        private String statusLabel;
    }
}
