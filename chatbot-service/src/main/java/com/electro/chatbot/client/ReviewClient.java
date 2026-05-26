package com.electro.chatbot.client;

import com.electro.chatbot.dto.CustomPageResponse;
import com.electro.chatbot.dto.ReviewResponseDto;
import com.electro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "review-service", path = "/api/reviews")
public interface ReviewClient {

    @GetMapping
    ApiResponse<CustomPageResponse<ReviewResponseDto>> getProductReviews(
            @RequestParam("product_id") Integer productId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    );
}
