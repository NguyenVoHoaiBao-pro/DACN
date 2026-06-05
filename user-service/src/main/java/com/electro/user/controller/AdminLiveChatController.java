package com.electro.user.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.user.dto.LiveChatDto;
import com.electro.user.service.LiveChatService;
import com.electro.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/live-chat")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ORDER_VIEW_ALL', 'CUSTOMER_VIEW', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
public class AdminLiveChatController {

    private final LiveChatService liveChatService;
    private final UserService userService;

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<LiveChatDto.ConversationSummary>>> inbox(
            @RequestParam(defaultValue = "false") boolean mineOnly) {
        Integer userId = currentUserId();
        return ResponseEntity.ok(ApiResponse.success("Inbox",
                liveChatService.adminInbox(userId, mineOnly)));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<ApiResponse<LiveChatDto.ConversationDetail>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Conversation",
                liveChatService.adminDetail(id, currentUserId())));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<LiveChatDto.MessageResponse>> reply(
            @PathVariable Long id,
            @RequestBody LiveChatDto.SendMessageRequest request) {
        Integer userId = currentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(ApiResponse.success("Sent",
                liveChatService.salesReply(id, userId, request.getBody())));
    }

    private Integer currentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        try {
            return userService.getUserByUsername(username).getId();
        } catch (Exception e) {
            return null;
        }
    }
}
