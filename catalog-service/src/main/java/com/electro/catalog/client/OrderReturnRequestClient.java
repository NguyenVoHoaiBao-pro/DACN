package com.electro.catalog.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "order-service", contextId = "orderReturnRequestClient", path = "/api/orders/internal/return-requests")
public interface OrderReturnRequestClient {

    @GetMapping("/by-serial")
    WarehouseLookupResponse lookupBySerial(@RequestParam("serial") String serial);

    @PostMapping("/link-warehouse")
    void linkWarehouse(@RequestBody WarehouseLinkRequest request);

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class WarehouseLookupResponse {
        private Integer returnRequestId;
        private String requestCode;
        private String status;
        private String statusLabel;
        private String orderCode;
        private String serialNumber;
        private String productName;
        private String reasonTypeLabel;
        private String reasonDetail;
        private java.time.LocalDateTime shipDeadline;
        private Integer daysLeftToShip;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    class WarehouseLinkRequest {
        private Integer returnRequestId;
        private Integer returnSlipId;
        private String returnSlipCode;
    }
}
