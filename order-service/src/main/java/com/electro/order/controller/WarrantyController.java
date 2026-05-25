package com.electro.order.controller;

import com.electro.order.dto.WarrantyDto;
import com.electro.order.service.WarrantyService;
import com.electro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/warranty")
@RequiredArgsConstructor
public class WarrantyController {

    private final WarrantyService warrantyService;

    @GetMapping("/check/{code}")
    public ResponseEntity<ApiResponse<WarrantyDto.Response>> checkWarranty(@PathVariable("code") String code) {
        WarrantyDto.Response response = warrantyService.checkWarranty(code);
        if (!response.isValid() && response.getProductName() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, response.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }
}
