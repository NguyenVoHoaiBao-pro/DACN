package com.electro.chatbot.controller;

import com.electro.chatbot.config.RagProperties;
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
    private final RagProperties ragProperties;

    private final AtomicBoolean ingestRunning = new AtomicBoolean(false);

    @GetMapping("/rag-status")
    @Operation(summary = "Trạng thái index RAG (Pinecone)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ragStatus() {
        boolean empty = true;
        String probeError = null;
        try {
            empty = ragChatbotService.isVectorIndexEmpty();
        } catch (Exception e) {
            probeError = e.getMessage();
            log.warn("rag-status probe failed: {}", probeError);
        }

        String hint = probeError != null
                ? "Không kiểm tra được Pinecone: " + probeError
                        + " — kiểm tra PINECONE_API_KEY trong .env, restart chatbot-service."
                : empty
                        ? "Chạy scripts/Setup-PineconeHybridIndex.ps1 rồi Reingest-Chatbot.ps1 (index dotproduct + hybrid)."
                        : "Index đã có dữ liệu — có thể chat.";

        Map<String, Object> data = new java.util.HashMap<>(Map.of(
                "indexEmpty", empty,
                "ingestRunning", ingestRunning.get(),
                "hybridEnabled", ragProperties.getHybrid().isEnabled(),
                "rerankEnabled", ragProperties.getRerank().isEnabled(),
                "retrievalTopK", ragProperties.getRetrievalTopK(),
                "finalTopK", ragProperties.getTopK(),
                "hint", hint
        ));
        if (probeError != null) {
            data.put("probeError", probeError);
        }
        return ResponseEntity.ok(ApiResponse.success("OK", data));
    }

    @PostMapping("/chat")
    @Operation(summary = "Gửi tin nhắn trò chuyện với Chatbot RAG", description = "AI tự động tìm kiếm ngữ cảnh sản phẩm trong Pinecone để tư vấn chính xác nhất")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@RequestBody ChatRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "Nội dung tin nhắn không được để trống"));
        }

        String aiResponse = ragChatbotService.chatWithRag(request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Phản hồi thành công", new ChatResponse(aiResponse)));
    }

    @PostMapping("/ingest")
    @PreAuthorize("hasAnyAuthority('PRODUCT_MANAGE', 'ROLE_ADMIN')")
    @Operation(summary = "Kích hoạt đồng bộ dữ liệu thủ công từ Microservices sang Pinecone", description = "Chỉ cho phép tài khoản Admin thực hiện")
    public ResponseEntity<ApiResponse<String>> triggerIngestion() {
        if (!ingestRunning.compareAndSet(false, true)) {
            return ResponseEntity.ok(ApiResponse.success(
                    "Đồng bộ Pinecone đang chạy nền — vui lòng đợi vài phút rồi kiểm tra GET /api/chatbot/rag-status.",
                    null));
        }

        log.info("Admin đã kích hoạt đồng bộ dữ liệu thủ công sang Pinecone (nền).");
        CompletableFuture.runAsync(() -> {
            try {
                productIngestionService.ingestAllProducts();
            } finally {
                ingestRunning.set(false);
            }
        });

        return ResponseEntity.accepted()
                .body(ApiResponse.success(
                        "Đã bắt đầu đồng bộ sản phẩm sang Pinecone trên nền (khoảng 5–15 phút). Kiểm tra GET /api/chatbot/rag-status.",
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
