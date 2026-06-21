package com.electro.statistics.service;

import com.electro.statistics.client.CatalogClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIRecommendationService {

    private final RestTemplate recoRestTemplate;
    private final CatalogClient catalogClient;

    @Value("${app.ai.url:http://reco-service}")
    private String aiServiceUrl;

    public AIRecommendationService(
            @Qualifier("recoRestTemplate") RestTemplate recoRestTemplate,
            CatalogClient catalogClient) {
        this.recoRestTemplate = recoRestTemplate;
        this.catalogClient = catalogClient;
    }

    /** Trang chu — SVD Collaborative Filtering. */
    public List<Map<String, Object>> getRecommendationsForUser(Integer userId) {
        String url = aiServiceUrl + "/recommend/" + userId + "?top_k=10";
        return fetchAndEnrich(url);
    }

    /** Trang chi tiet — Hybrid session (user + anchor SP dang xem). */
    public List<Map<String, Object>> getHybridRecommendations(Integer userId, Integer anchorProductId) {
        String url = UriComponentsBuilder
                .fromHttpUrl(aiServiceUrl + "/api/recommend/hybrid")
                .queryParam("user_id", userId)
                .queryParam("anchor_product_id", anchorProductId)
                .queryParam("top_n", 10)
                .toUriString();
        return fetchAndEnrich(url);
    }

    /** Trang chi tiet — CBF thuan (guest / khong can user). */
    public List<Map<String, Object>> getSimilarProducts(Integer anchorProductId) {
        String url = aiServiceUrl + "/api/recommend/similar/" + anchorProductId + "?top_n=10";
        return fetchAndEnrich(url);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchAndEnrich(String url) {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            Map body = recoRestTemplate.getForObject(url, Map.class);
            if (body == null || !body.containsKey("recommendations")) {
                return result;
            }
            List<Map<String, Object>> recommendedList =
                    (List<Map<String, Object>>) body.get("recommendations");
            for (Map<String, Object> rec : recommendedList) {
                Integer productId = ((Number) rec.get("product_id")).intValue();
                try {
                    CatalogClient.ProductResponse product = catalogClient.getProductById(productId);
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", product.getId());
                    item.put("name", product.getName() != null ? product.getName() : "");
                    if (rec.get("final_score") != null) {
                        item.put("final_score", rec.get("final_score"));
                    }
                    if (rec.get("cosine_score") != null) {
                        item.put("cosine_score", rec.get("cosine_score"));
                    }
                    if (rec.get("predicted_rating") != null) {
                        item.put("predicted_rating", rec.get("predicted_rating"));
                    }
                    result.add(item);
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        }
        return result;
    }
}
