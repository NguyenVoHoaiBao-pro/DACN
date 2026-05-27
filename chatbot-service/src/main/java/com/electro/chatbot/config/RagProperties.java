package com.electro.chatbot.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "rag")
public class RagProperties {

    /** Số chunk đưa vào LLM sau rerank */
    private int topK = 4;

    /** Số candidate lấy từ Pinecone trước rerank */
    private int retrievalTopK = 40;

    private double similarityThreshold = 0.0;

    private final Hybrid hybrid = new Hybrid();
    private final Rerank rerank = new Rerank();
    private final Ingest ingest = new Ingest();

    @Data
    public static class Hybrid {
        /** Bật dense+sparse trên cùng index (metric dotproduct) */
        private boolean enabled = true;
        /** 1.0 = chỉ dense, 0.0 = chỉ sparse — khuyến nghị 0.75 cho NL + SKU */
        private double alpha = 0.75;
        private String sparseModel = "pinecone-sparse-english-v0";
    }

    @Data
    public static class Rerank {
        private boolean enabled = true;
        private String model = "bge-reranker-v2-m3";
        /** Giữ lại sau rerank (thường = rag.top-k) */
        private int topN = 4;
    }

    @Data
    public static class Ingest {
        private int pageSize = 50;
        private boolean includeReviews = false;
    }
}
