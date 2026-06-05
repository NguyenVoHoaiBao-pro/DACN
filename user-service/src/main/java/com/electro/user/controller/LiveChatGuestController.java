package com.electro.user.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.user.dto.LiveChatDto;
import com.electro.user.service.LiveChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/live-chat/guest")
@RequiredArgsConstructor
public class LiveChatGuestController {

    private final LiveChatService liveChatService;

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<LiveChatDto.StartSessionResponse>> startSession(
            @RequestBody(required = false) LiveChatDto.StartSessionRequest request) {
        if (request == null) {
            request = new LiveChatDto.StartSessionRequest();
        }
        return ResponseEntity.ok(ApiResponse.success("Session started",
                liveChatService.startGuestSession(request)));
    }

    @PostMapping("/sessions/{sessionToken}/messages")
    public ResponseEntity<ApiResponse<LiveChatDto.MessageResponse>> sendMessage(
            @PathVariable String sessionToken,
            @Valid @RequestBody LiveChatDto.SendMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Message sent",
                liveChatService.guestSend(sessionToken, request)));
    }

    @GetMapping("/sessions/{sessionToken}/messages")
    public ResponseEntity<ApiResponse<List<LiveChatDto.MessageResponse>>> pollMessages(
            @PathVariable String sessionToken,
            @RequestParam(required = false) Long afterId) {
        return ResponseEntity.ok(ApiResponse.success("Messages",
                liveChatService.guestMessages(sessionToken, afterId)));
    }
}
