package com.electro.chatbot.controller;

import com.electro.chatbot.service.ProductIngestionService;
import com.electro.chatbot.service.RagChatbotService;
import com.electro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Chatbot API", description = "Endpoints phục vụ cho Chatbot tư vấn RAG và quản trị dữ liệu vector store")
@CrossOrigin(origins = "*")
public class ChatbotController {

    private final RagChatbotService ragChatbotService;
    private final ProductIngestionService productIngestionService;

    private final AtomicBoolean ingestRunning = new AtomicBoolean(false);

    @GetMapping("/rag-status")
    @Operation(summary = "Trạng thái index RAG (ChromaDB)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ragStatus() {
        boolean empty = ragChatbotService.isVectorIndexEmpty();
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of(
                "indexEmpty", empty,
                "ingestRunning", ingestRunning.get(),
                "hint", empty
                        ? "Chạy POST /api/chatbot/ingest (Admin) và đợi 5–15 phút."
                        : "Index đã có dữ liệu — có thể chat."
        )));
    }

    @PostMapping("/chat")
    @Operation(summary = "Gửi tin nhắn trò chuyện với Chatbot RAG", description = "AI tự động tìm kiếm ngữ cảnh sản phẩm & review trong ChromaDB để tư vấn chính xác nhất")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@RequestBody ChatRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "Nội dung tin nhắn không được để trống"));
        }

        String aiResponse = ragChatbotService.chatWithRag(request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Phản hồi thành công", new ChatResponse(aiResponse)));
    }

    @PostMapping("/ingest")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    @Operation(summary = "Kích hoạt đồng bộ dữ liệu thủ công từ Microservices sang ChromaDB", description = "Chỉ cho phép tài khoản Admin thực hiện")
    public ResponseEntity<ApiResponse<String>> triggerIngestion() {
        if (!ingestRunning.compareAndSet(false, true)) {
            return ResponseEntity.ok(ApiResponse.success(
                    "Đồng bộ ChromaDB đang chạy nền — vui lòng đợi vài phút rồi kiểm tra GET /api/chatbot/rag-status.",
                    null));
        }

        log.info("Admin đã kích hoạt đồng bộ dữ liệu thủ công sang ChromaDB (nền).");
        CompletableFuture.runAsync(() -> {
            try {
                productIngestionService.ingestAllProducts();
            } finally {
                ingestRunning.set(false);
            }
        });

        return ResponseEntity.accepted()
                .body(ApiResponse.success(
                        "Đã bắt đầu đồng bộ sản phẩm sang ChromaDB trên nền (khoảng 5–15 phút). Kiểm tra GET /api/chatbot/rag-status.",
                        null));
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatResponse {
        private String response;
    }
}
