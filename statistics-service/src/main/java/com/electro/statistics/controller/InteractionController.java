package com.electro.statistics.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.statistics.dto.UserInteractionDto;
import com.electro.statistics.service.UserInteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/interactions")
@RequiredArgsConstructor
public class InteractionController {

    private final UserInteractionService interactionService;

    @PostMapping("/track")
    public ResponseEntity<ApiResponse<UserInteractionDto.Response>> trackAction(
            @RequestBody UserInteractionDto.Request request) {
        UserInteractionDto.Response response = interactionService.trackInteraction(request);
        return ResponseEntity.ok(ApiResponse.success("Interaction tracked successfully", response));
    }
}
