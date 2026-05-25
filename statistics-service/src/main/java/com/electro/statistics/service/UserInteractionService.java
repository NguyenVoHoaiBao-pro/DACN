package com.electro.statistics.service;

import com.electro.statistics.dto.UserInteractionDto;
import com.electro.statistics.entity.UserInteraction;
import com.electro.statistics.repository.UserInteractionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserInteractionService {

    private final UserInteractionRepository repository;
    private final RedisTemplate<String, String> redisTemplate;

    private record ActionMeta(String normalizedType, BigDecimal score, boolean unique) {}

    /** DB electro_statistics_db: VIEW=1.0, CART=3.0, PURCHASE=5.0; aliases CLICK/ADD_TO_CART/RATING accepted. */
    private ActionMeta resolveAction(String rawActionType, BigDecimal rating) {
        if (rawActionType == null || rawActionType.isBlank()) {
            return new ActionMeta("VIEW", BigDecimal.ONE, false);
        }
        return switch (rawActionType.toUpperCase()) {
            case "VIEW" -> new ActionMeta("VIEW", BigDecimal.ONE, false);
            case "CART", "CLICK", "ADD_TO_CART" -> new ActionMeta("CART", BigDecimal.valueOf(3.0), true);
            case "PURCHASE" -> new ActionMeta("PURCHASE", BigDecimal.valueOf(5.0), false);
            case "RATED", "RATING" -> new ActionMeta("RATED",
                    rating != null ? rating : BigDecimal.valueOf(4.0), true);
            default -> new ActionMeta(rawActionType.toUpperCase(), BigDecimal.ONE, false);
        };
    }

    @Transactional
    public UserInteractionDto.Response trackInteraction(UserInteractionDto.Request request) {
        ActionMeta action = resolveAction(request.getActionType(), request.getRating());
        BigDecimal score = action.score();
        boolean isUniqueAction = action.unique();
        String actionType = action.normalizedType();

        if (isUniqueAction) {
            Optional<UserInteraction> existing = repository.findByUserIdAndProductIdAndActionType(
                    request.getUserId(), request.getProductId(), actionType);
            if (existing.isPresent()) {
                UserInteraction existingInt = existing.get();
                return UserInteractionDto.Response.builder()
                        .id(existingInt.getId())
                        .userId(existingInt.getUserId())
                        .productId(existingInt.getProductId())
                        .actionType(existingInt.getActionType())
                        .interactionScore(existingInt.getInteractionScore())
                        .message("Action already tracked.")
                        .build();
            }
        }

        if ("VIEW".equals(actionType)) {
            try {
                String logData = String.format("%s|%s|%s|%s",
                        request.getUserId(), request.getProductId(), "VIEW", System.currentTimeMillis());
                redisTemplate.opsForList().rightPush("analytics:interactions_queue", logData);
                return UserInteractionDto.Response.builder()
                        .userId(request.getUserId())
                        .productId(request.getProductId())
                        .actionType(actionType)
                        .interactionScore(score)
                        .message("Interaction logged on view queue buffer successfully.")
                        .build();
            } catch (Exception e) {
                log.error("Redis unavailable, fallback to MySQL: {}", e.getMessage());
            }
        }

        UserInteraction saved = repository.save(UserInteraction.builder()
                .userId(request.getUserId())
                .productId(request.getProductId())
                .actionType(actionType)
                .rating(request.getRating())
                .interactionScore(score)
                .createdAt(LocalDateTime.now())
                .build());

        return UserInteractionDto.Response.builder()
                .id(saved.getId())
                .userId(saved.getUserId())
                .productId(saved.getProductId())
                .actionType(saved.getActionType())
                .interactionScore(saved.getInteractionScore())
                .message("Interaction tracked successfully.")
                .build();
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void syncViewLogsFromRedisToMySQL() {
        String mainKey = "analytics:interactions_queue";
        String tempKey = "analytics:interactions_queue_sync_" + System.currentTimeMillis();
        if (Boolean.FALSE.equals(redisTemplate.hasKey(mainKey))) {
            return;
        }
        try {
            redisTemplate.rename(mainKey, tempKey);
        } catch (Exception e) {
            return;
        }
        List<String> listLogs = redisTemplate.opsForList().range(tempKey, 0, -1);
        if (listLogs == null || listLogs.isEmpty()) {
            redisTemplate.delete(tempKey);
            return;
        }
        List<UserInteraction> batchToSave = new ArrayList<>();
        for (String logStr : listLogs) {
            try {
                String[] parts = logStr.split("\\|");
                if (parts.length >= 3) {
                    Integer userId = "null".equals(parts[0]) ? 0 : Integer.parseInt(parts[0]);
                    Integer productId = Integer.parseInt(parts[1]);
                    batchToSave.add(UserInteraction.builder()
                            .userId(userId)
                            .productId(productId)
                            .actionType(parts[2])
                            .interactionScore(BigDecimal.ONE)
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            } catch (Exception e) {
                log.error("Error parsing view log: {}", logStr);
            }
        }
        if (!batchToSave.isEmpty()) {
            repository.saveAll(batchToSave);
        }
        redisTemplate.delete(tempKey);
    }
}
