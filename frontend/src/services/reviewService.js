import httpClient from "./httpClient";
import { API_PREFIX } from "../config/api";

const API = API_PREFIX;
const PUBLIC_REVIEWS_API = `${API}/reviews`;
const ADMIN_REVIEWS_API = `${API}/admin/reviews`;

// Helper to get auth header (token should be stored in localStorage)
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * POST /api/v1/upload
 * Upload ảnh đánh giá lên backend (Nhận URL trả về)
 * Body: FormData({ file: File })
 */
export const uploadReviewImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await httpClient.post(`${API}/v1/upload`, formData, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// ══════════════════════════════════════════════
// CUSTOMER APIs (Public & Authenticated)
// ══════════════════════════════════════════════

/**
 * GET /api/reviews/summary?product_id={id}
 * Lấy thống kê đánh giá (điểm TB, phân bổ sao)
 */
export const getReviewSummary = async (productId) => {
  const res = await httpClient.get(`${PUBLIC_REVIEWS_API}/summary`, {
    params: { product_id: productId },
  });
  return res.data;
};

/**
 * GET /api/reviews?product_id={id}&page=0&size=10&sort=createdAt,desc
 * Lấy danh sách đánh giá của sản phẩm (phân trang)
 */
export const getProductReviews = async (productId, page = 0, size = 10, sort = "createdAt,desc") => {
  const res = await httpClient.get(PUBLIC_REVIEWS_API, {
    params: { product_id: productId, page, size, sort },
  });
  return res.data;
};

/**
 * POST /api/reviews
 * Gửi đánh giá mới (Cần Token)
 * Body: { productId, rating, title, content, pros, cons, orderId, images[] }
 */
export const createReview = async (reviewData) => {
  const res = await httpClient.post(PUBLIC_REVIEWS_API, reviewData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * GET /api/reviews/my
 * Xem danh sách đánh giá của tôi (Cần Token)
 */
export const getMyReviews = async () => {
  const res = await httpClient.get(`${PUBLIC_REVIEWS_API}/my`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * PUT /api/reviews/{id}
 * Cập nhật bài đánh giá (Cần Token)
 */
export const updateReview = async (id, reviewData) => {
  const res = await httpClient.put(`${PUBLIC_REVIEWS_API}/${id}`, reviewData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * DELETE /api/reviews/{id}
 * Xóa bài đánh giá (Cần Token)
 */
export const deleteReview = async (id) => {
  const res = await httpClient.delete(`${PUBLIC_REVIEWS_API}/${id}`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * POST /api/reviews/{id}/helpful
 * Đánh dấu bài đánh giá là hữu ích (Public)
 */
export const markReviewHelpful = async (id) => {
  const res = await httpClient.post(`${PUBLIC_REVIEWS_API}/${id}/helpful`);
  return res.data;
};

// ══════════════════════════════════════════════
// ADMIN APIs (Protected)
// ══════════════════════════════════════════════

/**
 * GET /api/admin/reviews
 * Lấy toàn bộ danh sách đánh giá cho admin (phân trang)
 */
export const adminGetAllReviews = async (params = {}) => {
  const res = await httpClient.get(ADMIN_REVIEWS_API, {
    params,
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * PUT /api/admin/reviews/{id}/status
 * Duyệt hoặc Ẩn đánh giá
 * Body: { isApproved: boolean }
 */
export const adminUpdateReviewStatus = async (id, statusData) => {
  const res = await httpClient.put(`${ADMIN_REVIEWS_API}/${id}/status`, statusData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * POST /api/admin/reviews/{id}/reply
 * Phản hồi đánh giá của khách
 * Body: { replyContent: string }
 */
export const adminReplyReview = async (id, replyData) => {
  const res = await httpClient.post(`${ADMIN_REVIEWS_API}/${id}/reply`, replyData, {
    headers: getAuthHeader(),
  });
  return res.data;
};

/**
 * DELETE /api/admin/reviews/{id}
 * Xóa vĩnh viễn đánh giá (Admin)
 */
export const adminDeleteReview = async (id) => {
  const res = await httpClient.delete(`${ADMIN_REVIEWS_API}/${id}`, {
    headers: getAuthHeader(),
  });
  return res.data;
};
