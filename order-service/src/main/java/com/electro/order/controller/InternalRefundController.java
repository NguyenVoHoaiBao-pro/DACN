package com.electro.order.controller;

import com.electro.order.dto.RefundDto;
import com.electro.order.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders/internal/refunds")
@RequiredArgsConstructor
public class InternalRefundController {

    private final RefundService refundService;

    @PostMapping("/from-return")
    public RefundDto.Detail createFromReturn(@RequestBody RefundDto.CreateFromReturnRequest request) {
        return refundService.createFromReturn(request);
    }
}
