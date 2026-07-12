package com.electro.order.service.payment;

import com.electro.order.config.PaymentConfig;
import com.electro.order.dto.PaymentDto;
import com.electro.order.entity.Order;
import com.electro.order.entity.PaymentTransaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Tích hợp VNPay Payment Gateway.
 * <p>
 * Flow:
 * 1. Tạo URL thanh toán VNPay → redirect user tới URL đó
 * 2. User thanh toán trên VNPay → VNPay gọi IPN callback về server
 * 3. User redirect về return URL → server verify và hiển thị kết quả
 * <p>
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
@Service
public class VNPayService {

    private static final Logger log = LoggerFactory.getLogger(VNPayService.class);

    @Autowired
    private PaymentConfig paymentConfig;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpClient httpClient;

    @PostConstruct
    void initHttpClient() {
        if (paymentConfig.getVnpay().isTrustAllSsl()) {
            log.warn("VNPay trust-all-SSL is ENABLED (payment.vnpay.trust-all-ssl=true). "
                    + "Chỉ dùng dev local — không bật trên production.");
            httpClient = createTrustAllSslHttpClient();
        } else {
            httpClient = HttpClient.newHttpClient();
        }
    }

    /**
     * Tạo URL thanh toán VNPay
     */
    public PaymentDto.GatewayCreateResult createPaymentUrl(Order order, String ipAddress, String bankCode, String language) {
        try {
            PaymentConfig.VnPay vnpayConfig = paymentConfig.getVnpay();

            // Tạo mã giao dịch nội bộ
            String transactionRef = generateTransactionRef(order.getOrderCode());

            // Số tiền (VNPay yêu cầu nhân 100, không có phần thập phân)
            long amount = order.getTotalAmount().multiply(BigDecimal.valueOf(100)).longValue();

            // Thời gian tạo & hết hạn
            LocalDateTime now = LocalDateTime.now();
            String createDate = now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String expireDate = now.plusMinutes(15).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

            // Build VNPay params
            Map<String, String> vnpParams = new TreeMap<>();
            vnpParams.put("vnp_Version", vnpayConfig.getVersion());
            vnpParams.put("vnp_Command", vnpayConfig.getCommand());
            vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
            vnpParams.put("vnp_Amount", String.valueOf(amount));
            vnpParams.put("vnp_CurrCode", vnpayConfig.getCurrCode());
            vnpParams.put("vnp_TxnRef", transactionRef);
            vnpParams.put("vnp_OrderInfo", "Thanh toan don hang " + order.getOrderCode());
            vnpParams.put("vnp_OrderType", vnpayConfig.getOrderType());
            vnpParams.put("vnp_Locale", language != null ? language : vnpayConfig.getLocale());
            vnpParams.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
            vnpParams.put("vnp_IpAddr", ipAddress != null ? ipAddress : "127.0.0.1");
            vnpParams.put("vnp_CreateDate", createDate);
            vnpParams.put("vnp_ExpireDate", expireDate);

            if (bankCode != null && !bankCode.isBlank()) {
                vnpParams.put("vnp_BankCode", bankCode);
            }

            // Build query string & sign
            String queryString = buildQueryString(vnpParams, true);
            String signData = buildQueryString(vnpParams, false);
            String secureHash = hmacSHA512(vnpayConfig.getHashSecret(), signData);

            String paymentUrl = vnpayConfig.getPayUrl() + "?" + queryString + "&vnp_SecureHash=" + secureHash;

            log.info("VNPay payment URL created for order: {}, txnRef: {}", order.getOrderCode(), transactionRef);

            return PaymentDto.GatewayCreateResult.builder()
                    .success(true)
                    .paymentUrl(paymentUrl)
                    .transactionRef(transactionRef)
                    .build();

        } catch (Exception e) {
            log.error("Failed to create VNPay payment URL for order: {}", order.getOrderCode(), e);
            return PaymentDto.GatewayCreateResult.builder()
                    .success(false)
                    .errorMessage("Không thể tạo URL thanh toán VNPay: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Verify callback/return từ VNPay (dùng chung cho cả IPN và Return URL)
     */
    public PaymentDto.GatewayCallbackResult verifyCallback(Map<String, String> params) {
        try {
            PaymentConfig.VnPay vnpayConfig = paymentConfig.getVnpay();

            String vnpSecureHash = params.get("vnp_SecureHash");
            if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
                return PaymentDto.GatewayCallbackResult.builder()
                        .success(false)
                        .verified(false)
                        .message("Missing secure hash")
                        .build();
            }

            // Bỏ các field liên quan đến hash để verify
            Map<String, String> verifyParams = new TreeMap<>(params);
            verifyParams.remove("vnp_SecureHash");
            verifyParams.remove("vnp_SecureHashType");

            // Tạo lại hash
            String signData = buildQueryString(verifyParams, false);
            String checkHash = hmacSHA512(vnpayConfig.getHashSecret(), signData);

            boolean verified = checkHash.equalsIgnoreCase(vnpSecureHash);

            if (!verified) {
                log.warn("VNPay callback hash verification failed. TxnRef: {}", params.get("vnp_TxnRef"));
                return PaymentDto.GatewayCallbackResult.builder()
                        .success(false)
                        .verified(false)
                        .message("Invalid secure hash")
                        .build();
            }

            String responseCode = params.get("vnp_ResponseCode");
            String transactionNo = params.get("vnp_TransactionNo");
            String txnRef = params.get("vnp_TxnRef");
            String amountStr = params.get("vnp_Amount");
            BigDecimal amount = amountStr != null
                    ? new BigDecimal(amountStr).divide(BigDecimal.valueOf(100))
                    : BigDecimal.ZERO;

            // Tách orderCode từ transactionRef
            String orderCode = extractOrderCode(txnRef);

            boolean paymentSuccess = "00".equals(responseCode);
            String message = paymentSuccess ? "Thanh toán VNPay thành công" : "Thanh toán VNPay thất bại (code: " + responseCode + ")";

            log.info("VNPay callback verified. TxnRef: {}, ResponseCode: {}, Success: {}", txnRef, responseCode, paymentSuccess);

            return PaymentDto.GatewayCallbackResult.builder()
                    .success(paymentSuccess)
                    .verified(true)
                    .orderCode(orderCode)
                    .transactionRef(txnRef)
                    .gatewayTransactionId(transactionNo)
                    .amount(amount)
                    .responseCode(responseCode)
                    .message(message)
                    .build();

        } catch (Exception e) {
            log.error("Error verifying VNPay callback", e);
            return PaymentDto.GatewayCallbackResult.builder()
                    .success(false)
                    .verified(false)
                    .message("Lỗi xác thực callback VNPay: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Gọi API hoàn tiền VNPay (full/partial refund).
     * Checksum theo tài liệu VNPay: các field nối bằng "|", không dùng query-string như pay URL.
     */
    public PaymentDto.GatewayRefundResult refund(
            PaymentTransaction originalTxn, BigDecimal amount, String refundReason) {
        try {
            PaymentConfig.VnPay vnpayConfig = paymentConfig.getVnpay();
            if (originalTxn.getGatewayTransactionId() == null || originalTxn.getGatewayTransactionId().isBlank()) {
                return PaymentDto.GatewayRefundResult.builder()
                        .success(false)
                        .message("Thiếu mã giao dịch VNPay gốc (gatewayTransactionId)")
                        .build();
            }

            String requestId = String.valueOf(System.currentTimeMillis());
            long refundAmount = amount.multiply(BigDecimal.valueOf(100)).longValue();
            long originalAmount = originalTxn.getAmount() != null
                    ? originalTxn.getAmount().multiply(BigDecimal.valueOf(100)).longValue()
                    : refundAmount;
            String transactionType = refundAmount >= originalAmount ? "02" : "03";

            String createDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String txnDate = originalTxn.getCreatedAt() != null
                    ? originalTxn.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                    : createDate;

            String txnRef = originalTxn.getTransactionRef();
            String transactionNo = originalTxn.getGatewayTransactionId();
            String orderInfo = refundReason != null && !refundReason.isBlank()
                    ? refundReason : "Hoan tien don hang";
            if (orderInfo.length() > 255) {
                orderInfo = orderInfo.substring(0, 255);
            }

            String signData = buildRefundSignData(
                    requestId,
                    vnpayConfig.getVersion(),
                    "refund",
                    vnpayConfig.getTmnCode(),
                    transactionType,
                    txnRef,
                    String.valueOf(refundAmount),
                    transactionNo,
                    txnDate,
                    "admin",
                    createDate,
                    "127.0.0.1",
                    orderInfo);
            String secureHash = hmacSHA512(vnpayConfig.getHashSecret(), signData);

            Map<String, String> vnpParams = new LinkedHashMap<>();
            vnpParams.put("vnp_RequestId", requestId);
            vnpParams.put("vnp_Version", vnpayConfig.getVersion());
            vnpParams.put("vnp_Command", "refund");
            vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
            vnpParams.put("vnp_TransactionType", transactionType);
            vnpParams.put("vnp_TxnRef", txnRef);
            vnpParams.put("vnp_Amount", String.valueOf(refundAmount));
            vnpParams.put("vnp_OrderInfo", orderInfo);
            vnpParams.put("vnp_TransactionNo", transactionNo);
            vnpParams.put("vnp_TransactionDate", txnDate);
            vnpParams.put("vnp_CreateBy", "admin");
            vnpParams.put("vnp_CreateDate", createDate);
            vnpParams.put("vnp_IpAddr", "127.0.0.1");
            vnpParams.put("vnp_SecureHash", secureHash);

            String jsonBody = objectMapper.writeValueAsString(vnpParams);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(vnpayConfig.getApiUrl()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            String body = httpResponse.body();
            log.info("VNPay refund response: {}", body);

            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = objectMapper.readValue(body, Map.class);
            String responseCode = responseMap.get("vnp_ResponseCode") != null
                    ? responseMap.get("vnp_ResponseCode").toString() : null;
            String responseMessage = responseMap.get("vnp_Message") != null
                    ? responseMap.get("vnp_Message").toString() : null;
            boolean success = "00".equals(responseCode);
            String txnNo = responseMap.get("vnp_TransactionNo") != null
                    ? responseMap.get("vnp_TransactionNo").toString() : requestId;

            String message = success
                    ? "Hoàn tiền VNPay thành công"
                    : "VNPay refund failed: " + responseCode
                            + (responseMessage != null ? " - " + responseMessage : "");

            return PaymentDto.GatewayRefundResult.builder()
                    .success(success)
                    .gatewayRefundId(txnNo)
                    .responseCode(responseCode)
                    .message(message)
                    .rawResponse(body)
                    .build();
        } catch (Exception e) {
            log.error("VNPay refund error", e);
            return PaymentDto.GatewayRefundResult.builder()
                    .success(false)
                    .message("Lỗi gọi API hoàn tiền VNPay: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Checksum refund/querydr: field nối bằng "|" theo thứ tự tài liệu VNPay.
     */
    private static String buildRefundSignData(
            String requestId,
            String version,
            String command,
            String tmnCode,
            String transactionType,
            String txnRef,
            String amount,
            String transactionNo,
            String transactionDate,
            String createBy,
            String createDate,
            String ipAddr,
            String orderInfo) {
        return String.join("|",
                requestId,
                version,
                command,
                tmnCode,
                transactionType,
                txnRef,
                amount,
                transactionNo,
                transactionDate,
                createBy,
                createDate,
                ipAddr,
                orderInfo);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Helper methods
    // ═══════════════════════════════════════════════════════════════════════════

    private String generateTransactionRef(String orderCode) {
        // Format: orderCode_timestamp (VNPay yêu cầu unique mỗi lần gửi)
        return orderCode + "_" + System.currentTimeMillis();
    }

    private String extractOrderCode(String transactionRef) {
        if (transactionRef == null) return null;
        int idx = transactionRef.lastIndexOf("_");
        return idx > 0 ? transactionRef.substring(0, idx) : transactionRef;
    }

    /**
     * Build query string từ params map (sorted by key).
     *
     * QUAN TRỌNG — Đúng chuẩn VNPay (xem PHP demo chính thức):
     * - CẢ HAI trường hợp đều URLEncoder encode (như PHP urlencode()).
     * - isQueryString = false (tính HMAC hash): encode value, GIỮ NGUYÊN '+' (dấu cách = '+')
     * - isQueryString = true  (build URL cho browser): encode value, đổi '+' → '%20'
     * Sai điểm này sẽ dẫn đến lỗi "Sai chữ ký" vì VNPay tính hash với '+', ta tính với '%20'.
     */
    private String buildQueryString(Map<String, String> params, boolean isQueryString) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                if (sb.length() > 0) sb.append("&");
                String key = entry.getKey();
                String value = entry.getValue();
                try {
                    String encodedKey   = URLEncoder.encode(key,   StandardCharsets.US_ASCII.toString());
                    String encodedValue = URLEncoder.encode(value, StandardCharsets.US_ASCII.toString());
                    // URLEncoder mặc định dùng '+' cho dấu cách — đúng chuẩn VNPay khi tính hash.
                    // Chỉ đổi '+' → '%20' trên URL thật hiển thị cho browser.
                    if (isQueryString) {
                        encodedValue = encodedValue.replace("+", "%20");
                        encodedKey   = encodedKey.replace("+", "%20");
                    }
                    sb.append(encodedKey).append("=").append(encodedValue);
                } catch (Exception e) {
                    sb.append(key).append("=").append(value);
                }
            }
        }
        return sb.toString();
    }

    /**
     * HMAC-SHA512 signing
     */
    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error computing HMAC-SHA512", e);
        }
    }

    /**
     * Bỏ qua PKIX cho outbound HttpClient (refund API). Dev/sandbox only.
     */
    private static HttpClient createTrustAllSslHttpClient() {
        try {
            TrustManager[] trustAll = new TrustManager[]{
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public void checkServerTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }
                    }
            };
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAll, new SecureRandom());
            return HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot create VNPay trust-all SSL HttpClient", e);
        }
    }
}
