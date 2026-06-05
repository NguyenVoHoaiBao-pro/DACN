package com.electro.user.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.user.dto.LiveChatDto;
import com.electro.user.entity.User;
import com.electro.user.service.LiveChatService;
import com.electro.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/live-chat")
@RequiredArgsConstructor
public class LiveChatCustomerController {

    private final LiveChatService liveChatService;
    private final UserService userService;

    /** Khách đã đăng nhập — server lấy đúng profile từ JWT */
    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<LiveChatDto.StartSessionResponse>> startSession(
            @RequestBody(required = false) LiveChatDto.StartSessionRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User customer = userService.getUserEntityByUsername(username);
        return ResponseEntity.ok(ApiResponse.success("Session started",
                liveChatService.startCustomerSession(request, customer)));
    }
}
