package com.electro.statistics.service;

import com.electro.statistics.client.CatalogClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AIRecommendationService {

    private final RestTemplate restTemplate;
    private final CatalogClient catalogClient;

    @Value("${app.ai.url:http://localhost:5000}")
    private String aiServiceUrl;

    public List<Map<String, Object>> getRecommendationsForUser(Integer userId) {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            String url = aiServiceUrl + "/recommend/" + userId + "?top_k=10";
            Map body = restTemplate.getForObject(url, Map.class);
            if (body != null && body.containsKey("recommendations")) {
                List<Map<String, Object>> recommendedList = (List<Map<String, Object>>) body.get("recommendations");
                for (Map<String, Object> rec : recommendedList) {
                    Integer productId = ((Number) rec.get("product_id")).intValue();
                    try {
                        CatalogClient.ProductResponse product = catalogClient.getProductById(productId);
                        Map<String, Object> item = Map.of(
                                "id", product.getId(),
                                "name", product.getName() != null ? product.getName() : ""
                        );
                        result.add(item);
                    } catch (Exception ignored) {
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return result;
    }
}
