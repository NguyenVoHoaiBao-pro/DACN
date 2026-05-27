package com.electro.chatbot.pinecone;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pinecone Control / Inference / Data plane (hybrid query, upsert, rerank).
 */
@Component
@Slf4j
public class PineconeRagClient {

    private static final String API_VERSION = "2025-04";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String indexName;
    private final String namespace;

    private volatile String indexHost;

    public PineconeRagClient(
            ObjectMapper objectMapper,
            @Value("${PINECONE_API_KEY:${spring.ai.vectorstore.pinecone.api-key:}}") String apiKey,
            @Value("${PINECONE_INDEX_NAME:electro-store-products}") String indexName,
            @Value("${PINECONE_NAMESPACE:${spring.ai.vectorstore.pinecone.namespace:}}") String namespace) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.indexName = indexName;
        this.namespace = namespace == null ? "" : namespace;
        if (apiKey == null || apiKey.isBlank()) {
            log.error("PINECONE_API_KEY chưa được cấu hình — gọi Pinecone data plane sẽ trả 401");
        }
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("Api-Key", apiKey)
                .defaultHeader("X-Pinecone-Api-Version", API_VERSION)
                .build();
    }

    public void clearIndexHostCache() {
        indexHost = null;
    }

    public String getIndexHost() {
        if (indexHost != null) {
            return indexHost;
        }
        synchronized (this) {
            if (indexHost != null) {
                return indexHost;
            }
            indexHost = fetchIndexHostFromControlPlane();
            log.info("Pinecone index host: {}", indexHost);
            return indexHost;
        }
    }

    private String fetchIndexHostFromControlPlane() {
        JsonNode index = restClient.get()
                .uri("https://api.pinecone.io/indexes/{name}", indexName)
                .retrieve()
                .body(JsonNode.class);
        if (index == null || !index.has("host")) {
            throw new IllegalStateException("Không lấy được host cho index Pinecone: " + indexName);
        }
        return index.get("host").asText();
    }

    /**
     * Số vector trong namespace hiện tại (nhẹ, không cần embedding).
     */
    public long getNamespaceVectorCount() {
        return withHostRetry(host -> {
            ObjectNode body = objectMapper.createObjectNode();
            if (!namespace.isBlank()) {
                body.put("namespace", namespace);
            }
            JsonNode response = restClient.post()
                    .uri("https://{host}/describe_index_stats", host)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null) {
                return 0L;
            }
            if (!namespace.isBlank() && response.has("namespaces")) {
                JsonNode ns = response.get("namespaces").get(namespace);
                if (ns != null && ns.has("vectorCount")) {
                    return ns.get("vectorCount").asLong();
                }
                return 0L;
            }
            if (response.has("totalVectorCount")) {
                return response.get("totalVectorCount").asLong();
            }
            return 0L;
        });
    }

    private <T> T withHostRetry(HostOperation<T> operation) {
        try {
            return operation.apply(getIndexHost());
        } catch (HttpStatusCodeException e) {
            int code = e.getStatusCode().value();
            if (code == 401 || code == 404) {
                log.warn("Pinecone data plane HTTP {} — làm mới index host (có thể index vừa tạo lại)", code);
                clearIndexHostCache();
                return operation.apply(getIndexHost());
            }
            throw e;
        }
    }

    @FunctionalInterface
    private interface HostOperation<T> {
        T apply(String host);
    }

    public List<SparseVectorValues> embedSparse(String model, List<String> texts, String inputType) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        ArrayNode inputs = body.putArray("inputs");
        for (String text : texts) {
            ObjectNode inputItem = objectMapper.createObjectNode();
            inputItem.put("text", text);
            inputs.add(inputItem);
        }
        ObjectNode params = body.putObject("parameters");
        params.put("input_type", inputType);
        params.put("truncate", "END");

        JsonNode response = restClient.post()
                .uri("https://api.pinecone.io/embed")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        if (response == null || !response.has("data")) {
            throw new IllegalStateException("Pinecone sparse embed: response rỗng");
        }

        List<SparseVectorValues> result = new ArrayList<>();
        for (JsonNode item : response.get("data")) {
            List<Long> indices = new ArrayList<>();
            List<Float> values = new ArrayList<>();
            JsonNode indexNode = item.has("sparse_indices") ? item.get("sparse_indices") : item.get("sparseIndices");
            JsonNode valueNode = item.has("sparse_values") ? item.get("sparse_values") : item.get("sparseValues");
            if (indexNode != null) {
                for (JsonNode idx : indexNode) {
                    indices.add(idx.longValue());
                }
            }
            if (valueNode != null) {
                for (JsonNode val : valueNode) {
                    values.add((float) val.asDouble());
                }
            }
            result.add(new SparseVectorValues(indices, values));
        }
        return result;
    }

    public void upsertHybrid(
            List<String> ids,
            List<List<Float>> denseVectors,
            List<SparseVectorValues> sparseVectors,
            List<Map<String, Object>> metadataList) {
        if (ids.isEmpty()) {
            return;
        }
        ArrayNode vectors = objectMapper.createArrayNode();
        for (int i = 0; i < ids.size(); i++) {
            ObjectNode vec = objectMapper.createObjectNode();
            vec.put("id", ids.get(i));
            ArrayNode values = vec.putArray("values");
            denseVectors.get(i).forEach(values::add);
            ObjectNode sparse = vec.putObject("sparse_values");
            ArrayNode sparseIndices = sparse.putArray("indices");
            sparseVectors.get(i).indices().forEach(sparseIndices::add);
            ArrayNode sparseValues = sparse.putArray("values");
            sparseVectors.get(i).values().forEach(sparseValues::add);
            ObjectNode meta = vec.putObject("metadata");
            metadataList.get(i).forEach((k, v) -> putMetadata(meta, k, v));
            vectors.add(vec);
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.set("vectors", vectors);
        if (!namespace.isBlank()) {
            body.put("namespace", namespace);
        }

        withHostRetry(host -> {
            restClient.post()
                    .uri("https://{host}/vectors/upsert", host)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public List<HybridQueryMatch> queryHybrid(
            List<Float> denseQuery,
            SparseVectorValues sparseQuery,
            int topK) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("topK", topK);
        body.put("includeMetadata", true);
        body.put("includeValues", false);
        if (!namespace.isBlank()) {
            body.put("namespace", namespace);
        }
        ArrayNode dense = body.putArray("vector");
        denseQuery.forEach(dense::add);
        ObjectNode sparse = body.putObject("sparse_vector");
        ArrayNode indices = sparse.putArray("indices");
        sparseQuery.indices().forEach(indices::add);
        ArrayNode values = sparse.putArray("values");
        sparseQuery.values().forEach(values::add);

        return withHostRetry(host -> {
            JsonNode response = restClient.post()
                    .uri("https://{host}/query", host)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            List<HybridQueryMatch> matches = new ArrayList<>();
            if (response == null || !response.has("matches")) {
                return matches;
            }
            for (JsonNode match : response.get("matches")) {
                String id = match.get("id").asText();
                float score = (float) match.get("score").asDouble();
                Map<String, Object> metadata = new HashMap<>();
                if (match.has("metadata") && match.get("metadata").isObject()) {
                    match.get("metadata").fields().forEachRemaining(e ->
                            metadata.put(e.getKey(), jsonToObject(e.getValue())));
                }
                matches.add(new HybridQueryMatch(id, score, metadata));
            }
            return matches;
        });
    }

    public List<RerankResult> rerank(String model, String query, List<String> documents, int topN) {
        if (documents.isEmpty()) {
            return List.of();
        }
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("query", query);
        body.put("top_n", topN);
        body.put("return_documents", false);
        ArrayNode docs = body.putArray("documents");
        documents.forEach(docs::add);

        JsonNode response = restClient.post()
                .uri("https://api.pinecone.io/rerank")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        List<RerankResult> results = new ArrayList<>();
        if (response == null || !response.has("data")) {
            return results;
        }
        for (JsonNode item : response.get("data")) {
            int index = item.get("index").asInt();
            float score = (float) item.get("score").asDouble();
            results.add(new RerankResult(index, score));
        }
        return results;
    }

    private static void putMetadata(ObjectNode meta, String key, Object value) {
        if (value == null) {
            return;
        }
        if (value instanceof String s) {
            meta.put(key, s);
        } else if (value instanceof Number n) {
            meta.put(key, n.doubleValue());
        } else if (value instanceof Boolean b) {
            meta.put(key, b);
        } else {
            meta.put(key, value.toString());
        }
    }

    private static Object jsonToObject(JsonNode node) {
        if (node.isTextual()) {
            return node.asText();
        }
        if (node.isNumber()) {
            return node.numberValue();
        }
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        return node.toString();
    }

    public record HybridQueryMatch(String id, float score, Map<String, Object> metadata) {
    }

    public record RerankResult(int index, float score) {
    }
}
