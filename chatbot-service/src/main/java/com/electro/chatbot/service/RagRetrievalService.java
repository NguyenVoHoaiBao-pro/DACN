package com.electro.chatbot.service;

import com.electro.chatbot.config.RagProperties;
import com.electro.chatbot.pinecone.HybridScoreNormalizer;
import com.electro.chatbot.pinecone.PineconeRagClient;
import com.electro.chatbot.pinecone.SparseVectorValues;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Phase 2: hybrid search (dense + sparse) + Pinecone rerank.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagRetrievalService {

    private static final String META_TEXT = "text";

    private final RagProperties ragProperties;
    private final EmbeddingModel embeddingModel;
    private final VectorStore vectorStore;
    private final PineconeRagClient pineconeRagClient;

    public boolean isIndexEmpty() {
        try {
            return pineconeRagClient.getNamespaceVectorCount() <= 0;
        } catch (Exception e) {
            log.warn("Không đọc được thống kê Pinecone: {}", e.getMessage());
            return true;
        }
    }

    public List<Document> retrieve(String userQuery) {
        return retrieve(userQuery, ragProperties.getTopK());
    }

    public List<Document> retrieve(String userQuery, int finalTopK) {
        List<Document> candidates = ragProperties.getHybrid().isEnabled()
                ? hybridRetrieve(userQuery)
                : denseRetrieve(userQuery);

        if (candidates.isEmpty()) {
            return candidates;
        }

        if (!ragProperties.getRerank().isEnabled()) {
            return candidates.stream().limit(finalTopK).toList();
        }

        return rerank(userQuery, candidates, Math.min(finalTopK, ragProperties.getRerank().getTopN()));
    }

    private List<Document> denseRetrieve(String userQuery) {
        SearchRequest.Builder builder = SearchRequest.builder()
                .query(userQuery)
                .topK(ragProperties.getRetrievalTopK());
        SearchRequest request = ragProperties.getSimilarityThreshold() <= 0.0
                ? builder.similarityThreshold(SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL).build()
                : builder.similarityThreshold(ragProperties.getSimilarityThreshold()).build();
        return vectorStore.similaritySearch(request);
    }

    private List<Document> hybridRetrieve(String userQuery) {
        try {
            List<Float> dense = toFloatList(embeddingModel.embed(userQuery));
            dense = HybridScoreNormalizer.l2Normalize(dense);

            String sparseModel = ragProperties.getHybrid().getSparseModel();
            SparseVectorValues sparse = pineconeRagClient
                    .embedSparse(sparseModel, List.of(userQuery), "query")
                    .get(0);

            double alpha = ragProperties.getHybrid().getAlpha();
            dense = HybridScoreNormalizer.scaleDense(dense, alpha);
            sparse = HybridScoreNormalizer.scaleSparse(sparse, alpha);

            List<PineconeRagClient.HybridQueryMatch> matches = pineconeRagClient.queryHybrid(
                    dense,
                    sparse,
                    ragProperties.getRetrievalTopK()
            );

            log.info("Hybrid search: {} candidates (alpha={}, retrievalTopK={})",
                    matches.size(), alpha, ragProperties.getRetrievalTopK());

            return matches.stream()
                    .map(this::matchToDocument)
                    .collect(Collectors.toCollection(ArrayList::new));
        } catch (Exception e) {
            log.warn("Hybrid search thất bại (index cần metric dotproduct + sparse?). Fallback dense-only: {}",
                    e.getMessage());
            return denseRetrieve(userQuery);
        }
    }

    private List<Document> rerank(String query, List<Document> candidates, int topN) {
        List<String> texts = candidates.stream()
                .map(Document::getText)
                .toList();

        try {
            List<PineconeRagClient.RerankResult> ranked = pineconeRagClient.rerank(
                    ragProperties.getRerank().getModel(),
                    query,
                    texts,
                    topN
            );

            List<Document> reranked = new ArrayList<>();
            for (PineconeRagClient.RerankResult r : ranked) {
                if (r.index() >= 0 && r.index() < candidates.size()) {
                    reranked.add(candidates.get(r.index()));
                }
            }
            log.info("Rerank ({}): {} → {} chunks", ragProperties.getRerank().getModel(),
                    candidates.size(), reranked.size());
            return reranked;
        } catch (Exception e) {
            log.warn("Rerank thất bại, dùng thứ tự hybrid/dense: {}", e.getMessage());
            return candidates.stream().limit(topN).toList();
        }
    }

    private Document matchToDocument(PineconeRagClient.HybridQueryMatch match) {
        Map<String, Object> metadata = match.metadata() != null
                ? new java.util.HashMap<>(match.metadata())
                : new java.util.HashMap<>();
        String text = metadata.containsKey(META_TEXT)
                ? String.valueOf(metadata.get(META_TEXT))
                : metadata.getOrDefault("document_content", "").toString();
        metadata.putIfAbsent("rerank_score", match.score());
        return Document.builder()
                .id(match.id())
                .text(text)
                .metadata(metadata)
                .build();
    }

    /**
     * Ingest batch: dense (NVIDIA) + sparse (Pinecone) upsert.
     */
    public void upsertHybridChunks(List<Document> chunks) {
        if (chunks.isEmpty()) {
            return;
        }
        List<String> texts = chunks.stream().map(Document::getText).toList();
        List<String> ids = chunks.stream()
                .map(d -> d.getId() != null ? d.getId() : java.util.UUID.randomUUID().toString())
                .toList();

        List<List<Float>> denseBatch = new ArrayList<>();
        for (String text : texts) {
            List<Float> dense = toFloatList(embeddingModel.embed(text));
            denseBatch.add(HybridScoreNormalizer.l2Normalize(dense));
        }

        List<SparseVectorValues> sparseBatch = pineconeRagClient.embedSparse(
                ragProperties.getHybrid().getSparseModel(),
                texts,
                "passage"
        );

        List<Map<String, Object>> metadataList = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            Map<String, Object> meta = new java.util.HashMap<>(chunks.get(i).getMetadata());
            meta.put(META_TEXT, texts.get(i));
            meta.put("document_content", texts.get(i));
            metadataList.add(meta);
        }

        pineconeRagClient.upsertHybrid(ids, denseBatch, sparseBatch, metadataList);
    }

    private static List<Float> toFloatList(float[] values) {
        List<Float> list = new ArrayList<>(values.length);
        for (float v : values) {
            list.add(v);
        }
        return list;
    }
}
