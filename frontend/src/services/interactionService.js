import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

/**
 * Ghi hành vi người dùng — statistics-service qua Gateway
 */
const trackInteraction = async (userId, productId, actionType, rating = null) => {
  if (!productId) return;

  try {
    await httpClient.post(`${API_PREFIX}/interactions/track`, {
      userId: userId ? Number(userId) : null,
      productId: Number(productId),
      actionType,
      rating,
    });
  } catch (error) {
    console.warn("[AI Tracking] Ghi hành vi thất bại:", error.message);
  }
};

export const trackView = (userId, productId) => trackInteraction(userId, productId, "VIEW");
export const trackAddToCart = (userId, productId) => trackInteraction(userId, productId, "ADD_TO_CART");
export const trackPurchase = (userId, productId) => trackInteraction(userId, productId, "PURCHASE");
export const trackRating = (userId, productId, rating) => trackInteraction(userId, productId, "RATED", rating);

export default trackInteraction;
