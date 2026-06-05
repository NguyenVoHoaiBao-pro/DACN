package com.electro.chatbot.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.electro.chatbot.client.CatalogClient;
import com.electro.chatbot.client.ReviewClient;
import com.electro.chatbot.config.RagProperties;
import com.electro.chatbot.dto.CustomPageResponse;
import com.electro.chatbot.dto.ProductResponseDto;
import com.electro.chatbot.dto.ReviewResponseDto;
import com.electro.shared.dto.ApiResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductIngestionService {

    private final CatalogClient catalogClient;
    private final ReviewClient reviewClient;
    private final VectorStore vectorStore;
    private final RagRetrievalService ragRetrievalService;
    private final RagProperties ragProperties;

    @Scheduled(cron = "0 0 2 * * ?")
    public void ingestAllProducts() {
        log.info("Bắt đầu quá trình tự động đồng bộ dữ liệu sản phẩm sang Pinecone...");
        try {
            int page = 0;
            int size = ragProperties.getIngest().getPageSize();
            boolean isLast = false;
            int totalIngested = 0;

            while (!isLast) {
                ApiResponse<CustomPageResponse<ProductResponseDto>> response =
                        catalogClient.getAllProducts(page, size);
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

                        Map<String, Object> metadata = new HashMap<>();
                        metadata.put("productId", product.getId());
                        metadata.put("name", product.getName());
                        metadata.put("price", product.getPrice());
                        metadata.put("brand", product.getProducer() != null ? product.getProducer().getName() : "Không rõ");
                        metadata.put("type", product.getProductType() != null ? product.getProductType().getName() : "Không rõ");
                        metadata.put("averageRating", product.getAverageRating() != null ? product.getAverageRating() : 0.0);

                        String docId = "product-" + product.getId();
                        //Nhồi Văn Bản đó vào một đối tượng document(RAG Record)
                        Document doc = Document.builder()
                                .id(docId)
                                .text(aggregatedContent)
                                .metadata(metadata)
                                .build();
                        rawDocuments.add(doc);
                        totalIngested++;
                    } catch (Exception e) {
                        log.error("Lỗi khi xử lý dữ liệu cho sản phẩm ID {}: {}", product.getId(), e.getMessage());
                    }
                }
                
                //Đem Bản Ghi đã được gom đủ thành 4 Bảng đem đi chunking
                if (!rawDocuments.isEmpty()) {
                    //Chunking 500 từ và gối đầu 100 từ 
                    TokenTextSplitter splitter = new TokenTextSplitter(500, 100, 5, 10000, true);
                    //Áp dụng Kỹ Thuật Chunking chia nhỏ tài liệu đã được gom từ 4 Table Trên
                    List<Document> chunkedDocuments = assignChunkIds(splitter.apply(rawDocuments));

                    log.info("Đang nạp {} chunks cho {} sản phẩm trang {} (hybrid={})...",
                            chunkedDocuments.size(), rawDocuments.size(), page,
                            ragProperties.getHybrid().isEnabled());

                    if (ragProperties.getHybrid().isEnabled()) {
                        ragRetrievalService.upsertHybridChunks(chunkedDocuments);
                    } else {
                        //Lưu các Khối Chunk Vào Cơ Sở Dữ Liệu Vector Store
                        vectorStore.add(chunkedDocuments);
                    }
                }

                isLast = pageData.isLast() || page >= pageData.getTotalPages() - 1;
                page++;
            }

            log.info("Hoàn tất đồng bộ dữ liệu RAG! Tổng số sản phẩm đã xử lý: {}", totalIngested);

        } catch (Exception e) {
            log.error("Lỗi nghiêm trọng trong quá trình đồng bộ Ingestion: ", e);
        }
    }

    private static List<Document> assignChunkIds(List<Document> chunks) {
        Map<String, AtomicInteger> counters = new HashMap<>();
        List<Document> result = new ArrayList<>(chunks.size());
        for (Document chunk : chunks) {
            String baseId = chunk.getId() != null ? chunk.getId() : "doc";
            int idx = counters.computeIfAbsent(baseId, k -> new AtomicInteger(0)).getAndIncrement();
            String chunkId = baseId + "-c" + idx;
            result.add(Document.builder()
                    .id(chunkId)
                    .text(chunk.getText())
                    .metadata(chunk.getMetadata())
                    .build());
        }
        return result;
    }

    private String buildAggregatedProductContent(ProductResponseDto product) {
        StringBuilder sb = new StringBuilder();
        //Bảng 1 : Product
        sb.append("Tên sản phẩm: ").append(product.getName()).append("\n");
        sb.append("Mã sản phẩm (ID): ").append(product.getId()).append("\n");
        
        //Bảng 2 : Thương Hiệu - Hãng Sản Xuất
        if (product.getProducer() != null) {
            sb.append("Thương hiệu (Hãng sản xuất): ").append(product.getProducer().getName()).append("\n");
        }
        //Bảng 3 : Danh Mục Sản Phẩm
        if (product.getProductType() != null) {
            sb.append("Loại sản phẩm: ").append(product.getProductType().getName()).append("\n");
        }

        sb.append("Giá bán: ").append(product.getPrice() != null ? String.format("%,.0f VNĐ", product.getPrice()) : "Liên hệ").append("\n");
        sb.append("Số lượng tồn kho: ").append(product.getQuantity() != null ? product.getQuantity() : 0).append("\n");

        if (product.getDetail() != null && !product.getDetail().trim().isEmpty()) {
            String cleanDetail = product.getDetail().replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
            sb.append("Mô tả kỹ thuật chi tiết: ").append(cleanDetail).append("\n");
        }

        //Bảng 4 : Đánh giá sản phẩm
        if (!ragProperties.getIngest().isIncludeReviews()) {
            return sb.toString();
        }
         
        try {
            ApiResponse<CustomPageResponse<ReviewResponseDto>> reviewsResponse =
                    reviewClient.getProductReviews(product.getId(), 0, 50);
            if (reviewsResponse != null && reviewsResponse.isSuccess() && reviewsResponse.getData() != null) {
                List<ReviewResponseDto> reviews = reviewsResponse.getData().getContent();
                if (reviews != null && !reviews.isEmpty()) {
                    sb.append("Đánh giá thực tế từ khách hàng (Trung bình ")
                            .append(product.getAverageRating() != null ? product.getAverageRating() : "chưa có")
                            .append(" sao):\n");
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
            log.warn("Không thể lấy đánh giá cho sản phẩm ID {}: {}", product.getId(), e.getMessage());
            sb.append("Đánh giá thực tế: Tạm thời chưa đồng bộ được đánh giá.\n");
        }
        // TRẢ VỀ MỘT BÀI VĂN HOÀN CHỈNH GOM TỪ 4 NGUỒN!
        return sb.toString();
    }
}
