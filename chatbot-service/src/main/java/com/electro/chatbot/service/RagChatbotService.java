package com.electro.chatbot.service;

import com.electro.chatbot.config.RagProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

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
            
            Hệ thống tư vấn AI chưa được đồng bộ dữ liệu sản phẩm (Pinecone index đang trống hoặc chưa đủ). Admin vui lòng chạy scripts/Reingest-Chatbot.ps1 hoặc POST /api/chatbot/ingest, đợi vài phút rồi thử lại. Bạn cũng có thể xem sản phẩm trực tiếp trên website nhé!
            """.trim();

    private final RagRetrievalService ragRetrievalService;
    private final RagProperties ragProperties;
    private final ChatClient chatClient;

    public String chatWithRag(String userQuery) {
        log.info("Tiếp nhận câu hỏi từ người dùng: '{}'", userQuery);

        try {
            if (isVectorIndexEmpty()) {
                log.warn("Pinecone index có vẻ trống — không gọi LLM. Cần chạy ingest.");
                return INDEX_NOT_SYNCED_REPLY;
            }

            List<Document> similarDocuments = ragRetrievalService.retrieve(userQuery);

            log.info(
                    "RAG retrieval: {} chunk sau hybrid+rerank (retrievalTopK={}, final topK={}, hybrid={}, rerank={})",
                    similarDocuments.size(),
                    ragProperties.getRetrievalTopK(),
                    ragProperties.getTopK(),
                    ragProperties.getHybrid().isEnabled(),
                    ragProperties.getRerank().isEnabled()
            );

            if (similarDocuments.isEmpty()) {
                log.warn("Không có chunk cho câu hỏi — trả lời cố định, không gọi LLM.");
                return NO_RELEVANT_CONTEXT_REPLY;
            }

            String context = similarDocuments.stream()
                    .map(Document::getText)
                    .collect(Collectors.joining("\n---\n"));

            String allowedProductNames = extractAllowedProductNames(similarDocuments);

            String systemInstructions = """
                Bạn là "Electro Store Assistant" - nhân viên tư vấn của cửa hàng Electro Store.
                Bạn CHỈ được trả lời dựa trên THÔNG TIN BỐI CẢNH và DANH SÁCH SẢN PHẨM ĐƯỢC PHÉP bên dưới.
                Tuyệt đối KHÔNG dùng kiến thức có sẵn của mô hình để thêm sản phẩm, model, hãng hoặc giá không có trong bối cảnh.
                
                DANH SÁCH SẢN PHẨM ĐƯỢC PHÉP NHẮC TỚI (chỉ các tên sau — không thêm tên khác):
                %s
                
                QUY TẮC BẮT BUỘC:
                1. Chỉ mô tả/đề xuất sản phẩm có trong DANH SÁCH và THÔNG TIN BỐI CẢNH. Không liệt kê nhiều model giả nếu cửa hàng chỉ có một mục trong danh sách.
                2. Giá, thông số, ưu/nhược điểm phải khớp với bối cảnh; không bịa số liệu.
                3. Nếu chỉ có một sản phẩm trong danh sách, chỉ tư vấn một sản phẩm đó.
                4. Giọng điệu lịch sự, Tiếng Việt, Markdown gọn (in đậm tên/giá).
                5. Nếu bối cảnh không đủ trả lời, nói rõ Electro Store chưa có thêm thông tin trên hệ thống — KHÔNG đề xuất sản phẩm ngoài danh sách.
                
                THÔNG TIN BỐI CẢNH:
                %s
                """.formatted(allowedProductNames, context);

            log.info("Đang gửi yêu cầu tới NVIDIA NIM để sinh câu trả lời...");
            String aiResponse = chatClient.prompt()
                    .system(systemInstructions)
                    .user(userQuery)
                    .call()
                    .content();
            log.info("Đã nhận được câu trả lời từ AI.");

            return aiResponse;

        } catch (Exception e) {
            log.error("Lỗi xảy ra trong luồng RAG Chatbot: ", e);
            return "Dạ, Electro Store xin lỗi bạn vì sự cố kỹ thuật tạm thời này. Em chưa thể kết nối với hệ thống tư vấn thông minh ngay lúc này. Bạn vui lòng thử lại sau vài giây hoặc để lại câu hỏi để nhân viên bên em liên hệ hỗ trợ trực tiếp nhé!";
        }
    }

    public boolean isVectorIndexEmpty() {
        return ragRetrievalService.isIndexEmpty();
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
