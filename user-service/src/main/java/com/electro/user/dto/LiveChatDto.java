package com.electro.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class LiveChatDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartSessionRequest {
        private String guestName;
        private String guestPhone;
        private String guestEmail;
        /** Chỉ tin cậy khi tạo qua API có JWT; guest API bỏ qua field này */
        private Integer customerUserId;
        private String initialMessage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartSessionResponse {
        private String sessionToken;
        private Long conversationId;
        private Integer assignedSalesUserId;
        private String assignedSalesName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendMessageRequest {
        private String body;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageResponse {
        private Long id;
        private String senderType;
        private Integer senderUserId;
        private String senderName;
        private String body;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationSummary {
        private Long id;
        private String sessionToken;
        private String channel;
        private String guestName;
        private String guestPhone;
        private String guestEmail;
        private Integer customerUserId;
        /** Nhãn hiển thị cho Sales (tên + email/SĐT + mã KH) */
        private String guestDisplayLabel;
        private String status;
        private Integer assignedSalesUserId;
        private String assignedSalesName;
        private String lastPreview;
        private Integer unreadForSales;
        private LocalDateTime lastMessageAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationDetail {
        private ConversationSummary conversation;
        private List<MessageResponse> messages;
    }
}
