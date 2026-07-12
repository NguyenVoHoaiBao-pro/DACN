package com.electro.order.service;

import com.electro.order.dto.RefundDto;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

/**
 * Stub Napas account lookup — production sẽ gọi API Napas thật.
 */
@Service
public class NapasLookupService {

    private static final Map<String, String> BANK_BINS = Map.ofEntries(
            Map.entry("VIETCOMBANK", "970436"),
            Map.entry("VCB", "970436"),
            Map.entry("TECHCOMBANK", "970407"),
            Map.entry("TCB", "970407"),
            Map.entry("BIDV", "970418"),
            Map.entry("VIETINBANK", "970415"),
            Map.entry("VPBANK", "970432"),
            Map.entry("MBBANK", "970422"),
            Map.entry("ACB", "970416")
    );

    public RefundDto.NapasLookupResponse lookup(String bankName, String bankAccount) {
        if (bankName == null || bankName.isBlank()) {
            return RefundDto.NapasLookupResponse.builder()
                    .verified(false)
                    .message("Vui lòng nhập tên ngân hàng.")
                    .build();
        }
        if (bankAccount == null || bankAccount.isBlank()) {
            return RefundDto.NapasLookupResponse.builder()
                    .verified(false)
                    .message("Vui lòng nhập số tài khoản.")
                    .build();
        }
        String acct = bankAccount.trim().replaceAll("\\s+", "");
        if (!acct.matches("\\d{6,20}")) {
            return RefundDto.NapasLookupResponse.builder()
                    .bankName(bankName.trim())
                    .bankAccount(acct)
                    .verified(false)
                    .message("Số tài khoản không hợp lệ.")
                    .build();
        }

        String normalizedBank = bankName.trim().toUpperCase(Locale.ROOT);
        String holder = "NGUYEN VAN " + acct.substring(Math.max(0, acct.length() - 3));
        return RefundDto.NapasLookupResponse.builder()
                .bankName(bankName.trim())
                .bankAccount(acct)
                .accountHolderName(holder)
                .verified(true)
                .message("Napas lookup (demo): tài khoản hợp lệ tại "
                        + normalizedBank + ". Vui lòng xác nhận với khách.")
                .build();
    }

    public String resolveBankBin(String bankName) {
        if (bankName == null) {
            return "970436";
        }
        String key = bankName.trim().toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
        for (var entry : BANK_BINS.entrySet()) {
            if (key.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "970436";
    }

    public String buildVietQrUrl(String bankName, String bankAccount, String accountName,
                                 java.math.BigDecimal amount, String transferInfo) {
        String bin = resolveBankBin(bankName);
        String acct = bankAccount != null ? bankAccount.trim().replaceAll("\\s+", "") : "";
        StringBuilder url = new StringBuilder("https://img.vietqr.io/image/")
                .append(bin).append("-").append(acct).append("-compact2.png");
        url.append("?amount=").append(amount != null ? amount.longValue() : 0);
        if (transferInfo != null && !transferInfo.isBlank()) {
            url.append("&addInfo=").append(java.net.URLEncoder.encode(transferInfo, java.nio.charset.StandardCharsets.UTF_8));
        }
        if (accountName != null && !accountName.isBlank()) {
            url.append("&accountName=").append(java.net.URLEncoder.encode(accountName, java.nio.charset.StandardCharsets.UTF_8));
        }
        return url.toString();
    }
}
