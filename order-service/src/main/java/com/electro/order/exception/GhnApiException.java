package com.electro.order.exception;

/**
 * GHN API không phản hồi hoặc trả lỗi — dùng để Circuit Breaker ghi nhận failure.
 */
public class GhnApiException extends RuntimeException {

    public GhnApiException(String message) {
        super(message);
    }

    public GhnApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
