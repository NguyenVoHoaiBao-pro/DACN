package com.electro.order.client.ghn;

import com.electro.order.config.GHNConfig;
import com.electro.order.exception.GhnApiException;
import com.fasterxml.jackson.databind.JsonNode;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

/**
 * Gọi GHN API qua Circuit Breaker {@code ghn-shipping}.
 * Khi GHN lỗi liên tục → OPEN → fallback phí ship mặc định, không chờ timeout mỗi request.
 */
@Component
public class GhnCircuitBreakerClient {

    private static final Logger log = LoggerFactory.getLogger(GhnCircuitBreakerClient.class);

    private static final String SERVICES_API = "/shiip/public-api/v2/shipping-order/available-services";
    private static final String FEE_API = "/shiip/public-api/v2/shipping-order/fee";

    private final GHNConfig ghnConfig;
    private final RestTemplate restTemplate;

    public GhnCircuitBreakerClient(GHNConfig ghnConfig, RestTemplate restTemplate) {
        this.ghnConfig = ghnConfig;
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "ghn-shipping", fallbackMethod = "resolveServiceIdFallback")
    public Integer resolveServiceId(int fromDistrictId, int toDistrictId) {
        String url = ghnConfig.getBaseUrl() + SERVICES_API;

        Map<String, Object> body = new HashMap<>();
        body.put("shop_id", ghnConfig.getShopId());
        body.put("from_district", fromDistrictId);
        body.put("to_district", toDistrictId);

        HttpHeaders headers = buildShopHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);

        JsonNode root = response.getBody();
        if (root == null || root.get("code").asInt() != 200 || !root.has("data") || root.get("data").isEmpty()) {
            throw new GhnApiException("GHN available-services returned empty or error: " + root);
        }

        JsonNode services = root.get("data");
        for (JsonNode svc : services) {
            if (svc.get("service_type_id").asInt() == 2) {
                return svc.get("service_id").asInt();
            }
        }
        for (JsonNode svc : services) {
            if (svc.get("service_type_id").asInt() == 5) {
                return svc.get("service_id").asInt();
            }
        }
        return services.get(0).get("service_id").asInt();
    }

    @SuppressWarnings("unused")
    private Integer resolveServiceIdFallback(int fromDistrictId, int toDistrictId, Throwable t) {
        log.warn("[CircuitBreaker:ghn-shipping] resolveServiceId fallback (from={}, to={}): {}",
                fromDistrictId, toDistrictId, t.getMessage());
        return null;
    }

    @CircuitBreaker(name = "ghn-shipping", fallbackMethod = "fetchShippingFeeFallback")
    public long fetchShippingFee(int serviceId, int toDistrictId, String toWardCode) {
        String url = UriComponentsBuilder
                .fromHttpUrl(ghnConfig.getBaseUrl() + FEE_API)
                .queryParam("service_id", serviceId)
                .queryParam("from_district_id", ghnConfig.getFromDistrictId())
                .queryParam("from_ward_code", ghnConfig.getFromWardCode())
                .queryParam("to_district_id", toDistrictId)
                .queryParam("to_ward_code", toWardCode)
                .queryParam("weight", ghnConfig.getDefaultWeight())
                .queryParam("length", ghnConfig.getDefaultLength())
                .queryParam("width", ghnConfig.getDefaultWidth())
                .queryParam("height", ghnConfig.getDefaultHeight())
                .toUriString();

        HttpHeaders headers = buildShopHeaders();
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        JsonNode root = response.getBody();
        if (root == null || root.get("code").asInt() != 200) {
            throw new GhnApiException("GHN fee API error: " + root);
        }
        return root.get("data").get("total").asLong();
    }

    @SuppressWarnings("unused")
    private long fetchShippingFeeFallback(int serviceId, int toDistrictId, String toWardCode, Throwable t) {
        log.warn("[CircuitBreaker:ghn-shipping] fetchShippingFee fallback (serviceId={}): {}",
                serviceId, t.getMessage());
        return ghnConfig.getFallbackShippingFee();
    }

    private HttpHeaders buildShopHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", ghnConfig.getToken());
        headers.set("ShopId", String.valueOf(ghnConfig.getShopId()));
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }
}
