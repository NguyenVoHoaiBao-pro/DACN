package com.electro.order.service;

import com.electro.order.entity.PaymentTransaction;
import com.electro.order.entity.RefundRequest;
import com.electro.order.repository.PaymentTransactionRepository;
import com.electro.order.repository.RefundRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinanceStatisticsService {

    private static final List<RefundRequest.RefundStatus> PENDING_REFUND_STATUSES = List.of(
            RefundRequest.RefundStatus.PENDING_APPROVAL,
            RefundRequest.RefundStatus.AWAITING_MANUAL_TRANSFER,
            RefundRequest.RefundStatus.PROCESSING,
            RefundRequest.RefundStatus.FAILED
    );

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RefundRequestRepository refundRequestRepository;

    public Map<String, Object> getFinanceSummary(String startDateStr, String endDateStr) {
        LocalDateTime[] range = resolveRange(startDateStr, endDateStr);
        LocalDateTime start = range[0];
        LocalDateTime end = range[1];

        BigDecimal paymentIn = paymentTransactionRepository.sumAmountByStatusAndDateRange(
                PaymentTransaction.TransactionStatus.SUCCESS, start, end);
        BigDecimal refundOut = refundRequestRepository.sumRefundAmountByStatusAndDateRange(
                RefundRequest.RefundStatus.COMPLETED, start, end);
        BigDecimal pendingRefundAmount = refundRequestRepository.sumRefundAmountByStatusIn(PENDING_REFUND_STATUSES);
        long pendingRefundCount = refundRequestRepository.countByStatusIn(PENDING_REFUND_STATUSES);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("startDate", start.toLocalDate().toString());
        result.put("endDate", end.toLocalDate().toString());
        result.put("totalPaymentIn", paymentIn);
        result.put("totalRefundOut", refundOut);
        result.put("netCashFlow", paymentIn.subtract(refundOut));
        result.put("pendingRefundAmount", pendingRefundAmount);
        result.put("pendingRefundCount", pendingRefundCount);
        return result;
    }

    public Map<String, Object> getFinanceLedger(String startDateStr, String endDateStr, int page, int limit) {
        LocalDateTime[] range = resolveRange(startDateStr, endDateStr);
        LocalDateTime start = range[0];
        LocalDateTime end = range[1];
        int safePage = Math.max(page, 0);
        int safeLimit = Math.min(Math.max(limit, 1), 100);

        Page<PaymentTransaction> payments = paymentTransactionRepository.findByCreatedAtBetween(
                start, end, PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<RefundRequest> refunds = refundRequestRepository.findByStatusInAndUpdatedAtBetweenOrderByUpdatedAtDesc(
                List.of(RefundRequest.RefundStatus.COMPLETED,
                        RefundRequest.RefundStatus.PENDING_APPROVAL,
                        RefundRequest.RefundStatus.AWAITING_MANUAL_TRANSFER,
                        RefundRequest.RefundStatus.PROCESSING,
                        RefundRequest.RefundStatus.FAILED),
                start, end);

        List<Map<String, Object>> entries = new ArrayList<>();

        for (PaymentTransaction pt : payments.getContent()) {
            boolean isIn = pt.getStatus() == PaymentTransaction.TransactionStatus.SUCCESS;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", "PAY-" + pt.getId());
            entry.put("type", "PAYMENT");
            entry.put("direction", isIn ? "IN" : "OUT");
            entry.put("referenceCode", pt.getOrderCode());
            entry.put("title", isIn ? "Thanh toán đơn hàng" : "Giao dịch thanh toán");
            entry.put("amount", pt.getAmount());
            entry.put("method", pt.getPaymentMethod() != null ? pt.getPaymentMethod().name() : null);
            entry.put("status", pt.getStatus().name());
            entry.put("occurredAt", formatDateTime(pt.getCreatedAt()));
            entries.add(entry);
        }

        for (RefundRequest rf : refunds) {
            boolean completed = rf.getStatus() == RefundRequest.RefundStatus.COMPLETED;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", "RF-" + rf.getId());
            entry.put("type", "REFUND");
            entry.put("direction", "OUT");
            entry.put("referenceCode", rf.getRefundCode());
            entry.put("title", completed ? "Hoàn tiền" : "Hoàn tiền chờ xử lý");
            entry.put("amount", rf.getRefundAmount());
            entry.put("method", rf.getPaymentMethod());
            entry.put("status", rf.getStatus().name());
            entry.put("occurredAt", formatDateTime(completed && rf.getExecutedAt() != null
                    ? rf.getExecutedAt() : rf.getCreatedAt()));
            entry.put("orderCode", rf.getOrderCode());
            entries.add(entry);
        }

        entries.sort((a, b) -> {
            String at = (String) a.get("occurredAt");
            String bt = (String) b.get("occurredAt");
            if (at == null || bt == null) return 0;
            return bt.compareTo(at);
        });

        int from = safePage * safeLimit;
        int to = Math.min(from + safeLimit, entries.size());
        List<Map<String, Object>> pageEntries = from >= entries.size()
                ? List.of()
                : entries.subList(from, to);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("entries", pageEntries);
        result.put("total", entries.size());
        result.put("page", safePage);
        result.put("limit", safeLimit);
        result.put("totalPages", entries.isEmpty() ? 0 : (int) Math.ceil(entries.size() / (double) safeLimit));
        return result;
    }

    private LocalDateTime[] resolveRange(String startDateStr, String endDateStr) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(30).with(LocalTime.MIN);
        if (startDateStr != null && endDateStr != null) {
            start = LocalDate.parse(startDateStr).atStartOfDay();
            end = LocalDate.parse(endDateStr).atTime(LocalTime.MAX);
        }
        return new LocalDateTime[]{start, end};
    }

    private String formatDateTime(LocalDateTime dt) {
        if (dt == null) return null;
        return dt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
