package com.electro.chatbot.service;

import com.electro.chatbot.client.CatalogClient;
import com.electro.chatbot.client.ReviewClient;
import com.electro.chatbot.dto.CustomPageResponse;
import com.electro.chatbot.dto.ProductResponseDto;
import com.electro.chatbot.dto.ReviewResponseDto;
import com.electro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductIngestionService {

    private final CatalogClient catalogClient;
    private final ReviewClient reviewClient;
    private final VectorStore vectorStore;

    @Value("${rag.ingest.page-size:50}")
    private int ingestPageSize;

    @Value("${rag.ingest.include-reviews:false}")
    private boolean ingestIncludeReviews;

    /**
     * Đồng bộ toàn bộ sản phẩm và đánh giá vào ChromaDB.
     * Chạy định kỳ vào 2 giờ sáng hàng ngày.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void ingestAllProducts() {
        log.info("Bắt đầu quá trình tự động đồng bộ dữ liệu sản phẩm sang ChromaDB...");
        try {
            int page = 0;
            int size = ingestPageSize;
            boolean isLast = false;
            int totalIngested = 0;
            int totalChunks = 0;

            // Xóa sạch Vector Store trước khi nạp mới hoặc cập nhật toàn bộ (tùy chọn)
            // Lưu ý: ChromaDB Spring AI starter tự động quản lý cập nhật nếu ID trùng, 
            // nên ta chỉ cần ghi đè/nạp đè các Document.

            while (!isLast) {
                ApiResponse<CustomPageResponse<ProductResponseDto>> response = catalogClient.getAllProducts(page, size);
                if (response == null || !response.isSuccess() || response.getData() == null) {
                    log.warn("Không thể lấy dữ liệu sản phẩm từ catalog-service tại trang {}", page);
                    break;
                }

                CustomPageResponse<ProductResponseDto> pageData = response.getData();
                List<ProductResponseDto> products = pageData.getContent();

                if (products == null || products.isEmpty()) {
                    log.info("Không có sản phẩm nào để đồng bộ.");
                    break;
                }

                List<Document> rawDocuments = new ArrayList<>();

                for (ProductResponseDto product : products) {
                    try {
                        String aggregatedContent = buildAggregatedProductContent(product);
                        
                        // Thiết lập metadata để phục vụ việc lọc (filtering) sau này
                        Map<String, Object> metadata = new HashMap<>();
                        metadata.put("productId", product.getId());
                        metadata.put("name", product.getName());
                        metadata.put("price", product.getPrice());
                        metadata.put("brand", product.getProducer() != null ? product.getProducer().getName() : "Không rõ");
                        metadata.put("type", product.getProductType() != null ? product.getProductType().getName() : "Không rõ");
                        metadata.put("averageRating", product.getAverageRating() != null ? product.getAverageRating() : 0.0);

                        String docId = "product-" + product.getId();
                        Document doc = new Document(docId, aggregatedContent, metadata);
                        rawDocuments.add(doc);
                        totalIngested++;
                    } catch (Exception e) {
                        log.error("Lỗi khi xử lý dữ liệu cho sản phẩm ID {}: {}", product.getId(), e.getMessage());
                    }
                }

                if (!rawDocuments.isEmpty()) {
                    // Cắt nhỏ văn bản (Chunking) bằng TokenTextSplitter
                    TokenTextSplitter splitter = new TokenTextSplitter(500, 100, 5, 10000, true);
                    List<Document> chunkedDocuments = splitter.apply(rawDocuments);

                    log.info("Đang nạp {} chunks cho {} sản phẩm của trang {} vào ChromaDB...", 
                            chunkedDocuments.size(), rawDocuments.size(), page);
                    
                    vectorStore.add(chunkedDocuments);
                }

                isLast = pageData.isLast() || page >= pageData.getTotalPages() - 1;
                page++;
            }

            log.info("Hoàn tất đồng bộ dữ liệu RAG! Tổng số sản phẩm đã xử lý: {}", totalIngested);

        } catch (Exception e) {
            log.error("Lỗi nghiêm trọng trong quá trình đồng bộ Ingestion: ", e);
        }
    }

    /**
     * Gộp thông tin sản phẩm và reviews thành 1 văn bản mô tả duy nhất giống Notebook mẫu.
     */
    private String buildAggregatedProductContent(ProductResponseDto product) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tên sản phẩm: ").append(product.getName()).append("\n");
        sb.append("Mã sản phẩm (ID): ").append(product.getId()).append("\n");
        
        if (product.getProducer() != null) {
            sb.append("Thương hiệu (Hãng sản xuất): ").append(product.getProducer().getName()).append("\n");
        }
        if (product.getProductType() != null) {
            sb.append("Loại sản phẩm: ").append(product.getProductType().getName()).append("\n");
        }
        
        sb.append("Giá bán: ").append(product.getPrice() != null ? String.format("%,.0f VNĐ", product.getPrice()) : "Liên hệ").append("\n");
        sb.append("Số lượng tồn kho: ").append(product.getQuantity() != null ? product.getQuantity() : 0).append("\n");
        
        if (product.getDetail() != null && !product.getDetail().trim().isEmpty()) {
            // Loại bỏ bớt HTML tags nếu description chứa HTML để giữ plain text sạch sẽ
            String cleanDetail = product.getDetail().replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
            sb.append("Mô tả kỹ thuật chi tiết: ").append(cleanDetail).append("\n");
        }

        if (!ingestIncludeReviews) {
            return sb.toString();
        }

        // Lấy danh sách đánh giá từ review-service (tắt mặc định để ingest nhanh hơn)
        try {
            ApiResponse<CustomPageResponse<ReviewResponseDto>> reviewsResponse = reviewClient.getProductReviews(product.getId(), 0, 50);
            if (reviewsResponse != null && reviewsResponse.isSuccess() && reviewsResponse.getData() != null) {
                List<ReviewResponseDto> reviews = reviewsResponse.getData().getContent();
                if (reviews != null && !reviews.isEmpty()) {
                    sb.append("Đánh giá thực tế từ khách hàng (Trung bình ").append(product.getAverageRating() != null ? product.getAverageRating() : "chưa có").append(" sao):\n");
                    for (int i = 0; i < reviews.size(); i++) {
                        ReviewResponseDto r = reviews.get(i);
                        if (Boolean.TRUE.equals(r.getIsApproved())) {
                            sb.append("  - Nhận xét ").append(i + 1).append(" (Đánh giá: ").append(r.getRating()).append(" sao): ");
                            if (r.getTitle() != null) sb.append("\"").append(r.getTitle()).append("\". ");
                            if (r.getContent() != null) sb.append(r.getContent());
                            if (r.getPros() != null && !r.getPros().trim().isEmpty()) sb.append(" [Ưu điểm: ").append(r.getPros()).append("]");
                            if (r.getCons() != null && !r.getCons().trim().isEmpty()) sb.append(" [Nhược điểm: ").append(r.getCons()).append("]");
                            sb.append("\n");
                        }
                    }
                } else {
                    sb.append("Đánh giá thực tế: Chưa có đánh giá nào cho sản phẩm này.\n");
                }
            }
        } catch (Exception e) {
            log.warn("Không thể lấy đánh giá cho sản phẩm ID {} từ review-service: {}", product.getId(), e.getMessage());
            sb.append("Đánh giá thực tế: Tạm thời chưa đồng bộ được đánh giá.\n");
        }

        return sb.toString();
    }
}
