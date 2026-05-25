package com.electro.catalog.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.catalog.dto.ProducerDto;
import com.electro.catalog.service.ProducerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public API — Danh sách nhà sản xuất cho bộ lọc phía khách hàng.
 * GET /api/producers → trả về tất cả producers đang active.
 */
@RestController
@RequestMapping("/api/producers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProducerController {

    private final ProducerService producerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProducerDto.SlimResponse>>> getAllProducers() {
        List<ProducerDto.SlimResponse> producers = producerService.getAllProducersSlim(true);
        return ResponseEntity.ok(ApiResponse.success("Producers retrieved successfully", producers));
    }
}

