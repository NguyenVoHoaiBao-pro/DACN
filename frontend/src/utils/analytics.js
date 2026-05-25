import httpClient from "../services/httpClient";
import { API_PREFIX } from "../config/api";

/**
 * Track ngầm hành vi người dùng (silent fail)
 */
export const trackInteraction = async ({ userId, productId, actionType, rating = null }) => {
  try {
    httpClient.post(`${API_PREFIX}/interactions/track`, {
      userId,
      productId,
      actionType,
      rating,
    });
  } catch (error) {
    console.debug("[Analytics] Tracking failed:", error);
  }
};
