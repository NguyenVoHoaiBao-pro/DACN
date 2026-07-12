package com.electro.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentDto {

    // ═══════════════════════════════════════════════════════════════════════════
    // REQUEST DTOs
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Yêu cầu tạo URL thanh toán (nếu user muốn retry / thanh toán lại đơn PENDING)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreatePaymentRequest {
        private String orderCode;        // mã đơn hàng cần thanh toán
        private String bankCode;         // (optional) mã ngân hàng cho VNPay
        private String language;         // "vn" hoặc "en" (default: vn)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSE DTOs
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Response khi tạo URL thanh toán thành công
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentUrlResponse {
        private String orderCode;
        private String paymentMethod;
        private String paymentUrl;       // URL redirect user tới trang thanh toán gateway
        private String transactionRef;   // mã giao dịch nội bộ
        private BigDecimal amount;
    }

    /**
     * Response khi kiểm tra trạng thái thanh toán
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentStatusResponse {
        private String orderCode;
        private String paymentMethod;
        private String paymentStatus;     // PENDING, PAID, FAILED, REFUNDED
        private String transactionRef;
        private BigDecimal amount;
        private LocalDateTime paidAt;
        private String gatewayTransactionId;
        private String message;
    }

    /**
     * Response trả về khi user redirect từ payment gateway
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentReturnResponse {
        private boolean success;
        private String orderCode;
        private String message;
        private String paymentStatus;
        private String transactionRef;
        private BigDecimal amount;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL DTOs (dùng nội bộ giữa các service)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Kết quả từ gateway sau khi tạo URL thanh toán
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GatewayCreateResult {
        private boolean success;
        private String paymentUrl;
        private String transactionRef;
        private String errorMessage;
    }

    /**
     * Kết quả sau khi verify callback/IPN từ gateway
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GatewayCallbackResult {
        private boolean success;
        private boolean verified;         // chữ ký hợp lệ
        private String orderCode;
        private String transactionRef;
        private String gatewayTransactionId;
        private BigDecimal amount;
        private String responseCode;      // mã lỗi từ gateway
        private String message;
    }

    /**
     * Kết quả gọi API hoàn tiền gateway
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GatewayRefundResult {
        private boolean success;
        private String gatewayRefundId;
        private String responseCode;
        private String message;
        private String rawResponse;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GatewayBalanceResult {
        private String paymentMethod;
        private BigDecimal merchantBalance;
        private BigDecimal requiredAmount;
        private boolean sufficient;
        private String message;
        private LocalDateTime checkedAt;
    }

    /**
     * Response cho payment transaction history
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentTransactionResponse {
        private Integer id;
        private String orderCode;
        private String transactionRef;
        private String gatewayTransactionId;
        private String paymentMethod;
        private String status;            // PENDING, SUCCESS, FAILED
        private BigDecimal amount;
        private String responseCode;
        private String responseMessage;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
