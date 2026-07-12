package com.electro.order.controller;

import com.electro.order.dto.CustomerReturnRequestDto;
import com.electro.order.service.CustomerReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders/internal/return-requests")
@RequiredArgsConstructor
public class InternalCustomerReturnRequestController {

    private final CustomerReturnRequestService service;

    @GetMapping("/by-serial")
    public CustomerReturnRequestDto.WarehouseLookupResponse lookupBySerial(
            @RequestParam String serial) {
        return service.lookupForWarehouse(serial);
    }

    @PostMapping("/link-warehouse")
    public void linkWarehouse(@RequestBody CustomerReturnRequestDto.WarehouseLinkRequest request) {
        service.linkWarehouseSlip(request);
    }
}
