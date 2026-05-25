package com.electro.statistics.exception;

import com.electro.shared.dto.ApiResponse;
import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.electro.statistics.controller")
@Slf4j
public class StatisticsExceptionHandler {

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ApiResponse<Void>> handleFeign(FeignException ex) {
        log.warn("Statistics Feign error: status={} message={}", ex.status(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.error(503, "Không thể lấy dữ liệu từ order-service. Kiểm tra order-service và Eureka."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Statistics API error", ex);
        String msg = ex.getMessage() != null && ex.getMessage().contains("HikariPool")
                ? "Cơ sở dữ liệu statistics đang quá tải. Thử lại sau hoặc kiểm tra kết nối MySQL (electro_statistics_db)."
                : "Lỗi xử lý thống kê: " + ex.getMessage();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, msg));
    }
}
