package com.electro.chatbot.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.ai.chat.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagChatbotService {

    private static final String NO_RELEVANT_CONTEXT_REPLY = """
            Dạ, Electro Store xin chào bạn!
            
            Hiện tại em chưa tìm thấy sản phẩm phù hợp với câu hỏi của bạn trên hệ thống cửa hàng. Bạn vui lòng xem thêm tại trang Sản phẩm trên website hoặc liên hệ hotline để nhân viên tư vấn trực tiếp nhé!
            """.trim();

    private static final String INDEX_NOT_SYNCED_REPLY = """
            Dạ, Electro Store xin chào bạn!
            
            Hệ thống tư vấn AI chưa được đồng bộ dữ liệu sản phẩm (ChromaDB đang trống hoặc chưa đủ). Admin vui lòng đăng nhập và chạy đồng bộ Chatbot (POST /api/chatbot/ingest), đợi vài phút rồi thử lại. Bạn cũng có thể xem sản phẩm trực tiếp trên website nhé!
            """.trim();

    private static final String INDEX_PROBE_QUERY = "sản phẩm điện tử electro store";

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    @Value("${rag.top-k:4}")
    private int ragTopK;

    @Value("${rag.similarity-threshold:0.0}")
    private double ragSimilarityThreshold;

    /**
     * Tiếp nhận câu hỏi, truy vấn ngữ cảnh từ ChromaDB, và gửi tới NVIDIA NIM để trả lời.
     */
    public String chatWithRag(String userQuery) {
        log.info("Tiếp nhận câu hỏi từ người dùng: '{}'", userQuery);
        
        try {
            if (isVectorIndexEmpty()) {
                log.warn("ChromaDB có vẻ trống — không gọi LLM. Cần chạy ingest.");
                return INDEX_NOT_SYNCED_REPLY;
            }

            // Bước 1: Tìm kiếm topK trong ChromaDB (ngưỡng 0 = không lọc thêm sau L2/cosine)
            SearchRequest searchRequest = buildSearchRequest(userQuery);
            List<Document> similarDocuments = vectorStore.similaritySearch(searchRequest);

            log.info(
                    "ChromaDB: {} chunk cho câu hỏi (topK={}, ngưỡng={})",
                    similarDocuments.size(),
                    ragTopK,
                    ragSimilarityThreshold
            );

            if (similarDocuments == null || similarDocuments.isEmpty()) {
                log.warn("Không có chunk cho câu hỏi — trả lời cố định, không gọi LLM.");
                return NO_RELEVANT_CONTEXT_REPLY;
            }

            // Bước 2: Tổng hợp ngữ cảnh + danh sách tên sản phẩm được phép nhắc tới
            String context = similarDocuments.stream()
                    .map(Document::getContent)
                    .collect(Collectors.joining("\n---\n"));

            String allowedProductNames = extractAllowedProductNames(similarDocuments);
            log.debug("Sản phẩm trong ngữ cảnh RAG: {}", allowedProductNames);

            // Bước 3: System prompt — chỉ dựa trên dữ liệu cửa hàng, không dùng kiến thức chung của model
            String systemInstructions = """
                Bạn là "Electro Store Assistant" - nhân viên tư vấn của cửa hàng Electro Store.
                Bạn CHỈ được trả lời dựa trên THÔNG TIN BỐI CẢNH và DANH SÁCH SẢN PHẨM ĐƯỢC PHÉP bên dưới.
                Tuyệt đối KHÔNG dùng kiến thức có sẵn của mô hình để thêm sản phẩm, model, hãng hoặc giá không có trong bối cảnh.
                
                DANH SÁCH SẢN PHẨM ĐƯỢC PHÉP NHẮC TỚI (chỉ các tên sau — không thêm tên khác):
                %s
                
                QUY TẮC BẮT BUỘC:
                1. Chỉ mô tả/đề xuất sản phẩm có trong DANH SÁCH và THÔNG TIN BỐI CẢNH. Không liệt kê nhiều model giả (ví dụ Apple Watch 8, Galaxy Watch4...) nếu cửa hàng chỉ có một mục trong danh sách.
                2. Giá, thông số, ưu/nhược điểm phải khớp với bối cảnh; không bịa số liệu.
                3. Nếu chỉ có một sản phẩm trong danh sách, chỉ tư vấn một sản phẩm đó; có thể trích mô tả kỹ thuật trong phần "Mô tả kỹ thuật chi tiết" của bối cảnh.
                4. Giọng điệu lịch sự, Tiếng Việt, Markdown gọn (in đậm tên/giá).
                5. Nếu bối cảnh không đủ trả lời, nói rõ Electro Store chưa có thêm thông tin trên hệ thống và mời liên hệ hotline — KHÔNG đề xuất sản phẩm ngoài danh sách.
                
                THÔNG TIN BỐI CẢNH:
                %s
                """.formatted(allowedProductNames, context);

            // Bước 4: Tạo Prompt với System Message và User Message
            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemInstructions));
            messages.add(new UserMessage(userQuery));
            
            Prompt prompt = new Prompt(messages);

            // Bước 5: Gọi API của NVIDIA NIM (đã được cấu hình qua spring-ai-openai)
            log.info("Đang gửi yêu cầu tới NVIDIA NIM để sinh câu trả lời...");
            String aiResponse = chatClient.call(prompt).getResult().getOutput().getContent();
            log.info("Đã nhận được câu trả lời từ AI.");

            return aiResponse;

        } catch (Exception e) {
            log.error("Lỗi xảy ra trong luồng RAG Chatbot: ", e);
            return "Dạ, Electro Store xin lỗi bạn vì sự cố kỹ thuật tạm thời này. Em chưa thể kết nối với hệ thống tư vấn thông minh ngay lúc này. Bạn vui lòng thử lại sau vài giây hoặc để lại câu hỏi để nhân viên bên em liên hệ hỗ trợ trực tiếp nhé!";
        }
    }

    private SearchRequest buildSearchRequest(String query) {
        SearchRequest request = SearchRequest.query(query).withTopK(ragTopK);
        if (ragSimilarityThreshold <= 0.0) {
            return request.withSimilarityThresholdAll();
        }
        return request.withSimilarityThreshold(ragSimilarityThreshold);
    }

    /** Kiểm tra nhanh xem vector store đã có dữ liệu sau ingest chưa. */
    public boolean isVectorIndexEmpty() {
        List<Document> probe = vectorStore.similaritySearch(
                SearchRequest.query(INDEX_PROBE_QUERY).withTopK(1).withSimilarityThresholdAll()
        );
        return probe == null || probe.isEmpty();
    }

    private static String extractAllowedProductNames(List<Document> documents) {
        Set<String> names = new LinkedHashSet<>();
        for (Document doc : documents) {
            if (doc.getMetadata() == null) {
                continue;
            }
            Object name = doc.getMetadata().get("name");
            if (name != null) {
                String trimmed = name.toString().trim();
                if (!trimmed.isEmpty()) {
                    names.add(trimmed);
                }
            }
        }
        if (names.isEmpty()) {
            return "(không có metadata tên sản phẩm — chỉ dùng đúng nội dung trong THÔNG TIN BỐI CẢNH)";
        }
        return names.stream()
                .map(n -> "- " + n)
                .collect(Collectors.joining("\n"));
    }
}
