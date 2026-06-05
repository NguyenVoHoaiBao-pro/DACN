package com.electro.review.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "order-service", path = "/api/orders/internal")
public interface OrderClient {

    // Tra cứu lịch sử mua hàng của User đối với một Sản phẩm cụ thể.
    // - Tính năng: Trả về true/false để xác định khách hàng đã thực sự xuất tiền mua món hàng này chưa.
    // - Ý nghĩa: Dùng để gắn huy hiệu "Đã mua hàng" (Verified Purchase) nhằm tăng độ uy tín cho Đánh giá, chống review ảo.
    @GetMapping("/users/{userId}/products/{productId}/verified-purchase")
    VerifiedPurchaseResponse verifiedPurchase(
            @PathVariable("userId") Integer userId,
            @PathVariable("productId") Integer productId);

    class VerifiedPurchaseResponse {
        private boolean verified;
        private Integer orderId;

        public boolean isVerified() {
            return verified;
        }

        public void setVerified(boolean verified) {
            this.verified = verified;
        }

        public Integer getOrderId() {
            return orderId;
        }

        public void setOrderId(Integer orderId) {
            this.orderId = orderId;
        }
    }
}
