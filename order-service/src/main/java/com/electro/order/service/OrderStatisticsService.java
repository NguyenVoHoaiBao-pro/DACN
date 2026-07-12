package com.electro.order.service;

import com.electro.order.entity.CustomerReturnRequest;
import com.electro.order.entity.Order;
import com.electro.order.entity.RefundRequest;
import com.electro.order.entity.WarrantyClaim;
import com.electro.order.repository.CustomerReturnRequestRepository;
import com.electro.order.repository.OrderDetailRepository;
import com.electro.order.repository.OrderRepository;
import com.electro.order.repository.RefundRequestRepository;
import com.electro.order.repository.WarrantyClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderStatisticsService {

    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final CustomerReturnRequestRepository customerReturnRequestRepository;
    private final WarrantyClaimRepository warrantyClaimRepository;

    private static final List<RefundRequest.RefundStatus> PENDING_REFUND_STATUSES = List.of(
            RefundRequest.RefundStatus.PENDING_APPROVAL,
            RefundRequest.RefundStatus.AWAITING_MANUAL_TRANSFER,
            RefundRequest.RefundStatus.PROCESSING,
            RefundRequest.RefundStatus.FAILED
    );

    private static final List<WarrantyClaim.ClaimStatus> OPEN_WARRANTY_STATUSES = List.of(
            WarrantyClaim.ClaimStatus.PENDING,
            WarrantyClaim.ClaimStatus.RECEIVED,
            WarrantyClaim.ClaimStatus.INSPECTING,
            WarrantyClaim.ClaimStatus.REPAIRING
    );

    private static final List<Order.OrderStatus> IMEI_QUEUE_STATUSES = List.of(
            Order.OrderStatus.CONFIRMED,
            Order.OrderStatus.PROCESSING
    );

    private final List<Order.OrderStatus> COMPLETED_STATUSES = List.of(
            Order.OrderStatus.DELIVERED,
            Order.OrderStatus.COMPLETED
    );

    private final Order.OrderStatus CANCELLED_STATUS = Order.OrderStatus.CANCELLED;

    public Map<String, Object> getOverviewStatistics() {
        BigDecimal totalRevenue = orderRepository.sumRevenueCompleted(COMPLETED_STATUSES);
        Long totalOrders = orderRepository.countActiveOrders(CANCELLED_STATUS);
        Long totalCustomers = orderRepository.countDistinctCustomers(CANCELLED_STATUS);
        Long totalProductsSold = orderDetailRepository.sumTotalProductsSold(COMPLETED_STATUSES);
        Long pendingOrders = orderRepository.countByStatus(Order.OrderStatus.PENDING);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfThisMonth = now.withDayOfMonth(1).with(LocalTime.MIN);
        LocalDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);

        BigDecimal revenueThisMonth = orderRepository.sumRevenueByDateRange(startOfThisMonth, now, COMPLETED_STATUSES);
        BigDecimal revenueLastMonth = orderRepository.sumRevenueByDateRange(startOfLastMonth, startOfThisMonth, COMPLETED_STATUSES);
        Long ordersThisMonth = orderRepository.countOrdersByDateRange(startOfThisMonth, now, CANCELLED_STATUS);
        Long ordersLastMonth = orderRepository.countOrdersByDateRange(startOfLastMonth, startOfThisMonth, CANCELLED_STATUS);
        Long customersThisMonth = orderRepository.countDistinctCustomersByDateRange(startOfThisMonth, now, CANCELLED_STATUS);
        Long customersLastMonth = orderRepository.countDistinctCustomersByDateRange(startOfLastMonth, startOfThisMonth, CANCELLED_STATUS);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenue", totalRevenue);
        result.put("totalOrders", totalOrders);
        result.put("totalCustomers", totalCustomers);
        result.put("totalProductsSold", totalProductsSold);
        result.put("pendingOrders", pendingOrders);
        result.put("revenueGrowthPercent", calculateGrowthPercent(revenueThisMonth, revenueLastMonth));
        result.put("orderGrowthPercent", calculateGrowthPercentLong(ordersThisMonth, ordersLastMonth));
        result.put("customerGrowthPercent", calculateGrowthPercentLong(customersThisMonth, customersLastMonth));
        return result;
    }

    public Map<String, Object> getRevenueChart(String period, String startDateStr, String endDateStr) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start;
        String effectivePeriod;

        if (startDateStr != null && endDateStr != null) {
            start = LocalDate.parse(startDateStr).atStartOfDay();
            end = LocalDate.parse(endDateStr).atTime(LocalTime.MAX);
            effectivePeriod = "custom";
        } else {
            effectivePeriod = period != null ? period : "month";
            switch (effectivePeriod) {
                case "day" -> start = end.minusDays(30).with(LocalTime.MIN);
                case "year" -> start = end.minusYears(5).with(LocalTime.MIN);
                default -> start = end.minusMonths(12).with(LocalTime.MIN);
            }
        }

        String chartPeriod = effectivePeriod;
        List<Map<String, Object>> dataPoints = switch (chartPeriod) {
            case "day", "custom" -> buildDailyDataPointsFilled(start, end);
            case "year" -> buildYearlyDataPoints();
            default -> buildMonthlyDataPointsFilled(start, end);
        };

        BigDecimal totalRevenue = dataPoints.stream()
                .map(p -> (BigDecimal) p.get("revenue"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageRevenue = dataPoints.isEmpty() ? BigDecimal.ZERO :
                totalRevenue.divide(BigDecimal.valueOf(dataPoints.size()), 0, RoundingMode.HALF_UP);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", chartPeriod);
        result.put("dataPoints", dataPoints);
        result.put("totalRevenue", totalRevenue);
        result.put("averageRevenue", averageRevenue);
        return result;
    }

    public Map<String, Object> getOrderStatusStats() {
        List<Object[]> results = orderRepository.countOrdersByEachStatus();
        Map<String, String> labelMap = Map.of(
                "PENDING", "Chờ xác nhận", "CONFIRMED", "Đã xác nhận", "PROCESSING", "Đang xử lý",
                "SHIPPING", "Đang giao hàng", "DELIVERED", "Đã giao", "COMPLETED", "Hoàn thành",
                "CANCELLED", "Đã hủy", "REFUNDED", "Hoàn tiền"
        );
        long totalOrders = results.stream().mapToLong(row -> toLong(row[1])).sum();
        List<Map<String, Object>> breakdown = results.stream().map(row -> {
            Order.OrderStatus status = (Order.OrderStatus) row[0];
            String statusStr = status.name();
            long count = toLong(row[1]);
            double percentage = totalOrders > 0 ? Math.round(count * 10000.0 / totalOrders) / 100.0 : 0.0;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("status", statusStr);
            item.put("label", labelMap.getOrDefault(statusStr, statusStr));
            item.put("count", count);
            item.put("percentage", percentage);
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalOrders", totalOrders);
        result.put("statusBreakdown", breakdown);
        return result;
    }

    public List<Map<String, Object>> getTopSellingProducts(int limit) {
        List<Object[]> results = orderDetailRepository.findTopSellingProducts(
                COMPLETED_STATUSES, PageRequest.of(0, limit));
        AtomicInteger rank = new AtomicInteger(1);
        return results.stream().map(row -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("rank", rank.getAndIncrement());
            item.put("productId", toInt(row[0]));
            item.put("productName", row[1]);
            item.put("variantName", row[2]);
            item.put("quantitySold", toLong(row[3]));
            item.put("revenue", toBigDecimal(row[4]));
            return item;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTopSellingProductsByProduct(int limit) {
        List<Object[]> results = orderDetailRepository.findTopSellingProductsByProductId(
                COMPLETED_STATUSES, PageRequest.of(0, limit));
        AtomicInteger rank = new AtomicInteger(1);
        return results.stream().map(row -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("rank", rank.getAndIncrement());
            item.put("productId", toInt(row[0]));
            item.put("quantitySold", toLong(row[1]));
            item.put("revenue", toBigDecimal(row[2]));
            return item;
        }).collect(Collectors.toList());
    }

    public long countSoldProducts() {
        return orderDetailRepository.countDistinctSoldProducts(COMPLETED_STATUSES);
    }

    public Map<Integer, Long> getSoldQuantitiesByProductIds(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        return orderDetailRepository.sumQuantityByProductIds(COMPLETED_STATUSES, productIds).stream()
                .collect(Collectors.toMap(
                        row -> toInt(row[0]),
                        row -> toLong(row[1]),
                        Long::sum));
    }

    public Map<String, Object> getRecentOrders(int limit) {
        List<Order> orders = orderRepository.findRecentOrders(PageRequest.of(0, limit));
        List<Map<String, Object>> summaries = orders.stream().map(o -> {
            int itemCount = o.getOrderDetails() != null ? o.getOrderDetails().size() : 0;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("orderId", o.getId());
            item.put("orderCode", o.getOrderCode());
            item.put("customerName", o.getShippingName());
            item.put("customerEmail", null);
            item.put("totalAmount", o.getTotalAmount());
            item.put("status", o.getStatus().name());
            item.put("paymentMethod", o.getPaymentMethod().name());
            item.put("paymentStatus", o.getPaymentStatus().name());
            item.put("orderDate", o.getOrderDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            item.put("itemCount", itemCount);
            return item;
        }).collect(Collectors.toList());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("recentOrders", summaries);
        return result;
    }

    public Map<String, Object> getActionKpis() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pendingOrders", orderRepository.countByStatus(Order.OrderStatus.PENDING));
        result.put("pendingImeiOrders", orderRepository.countOrdersWithIncompleteImei(IMEI_QUEUE_STATUSES));
        result.put("pendingRefundCount", refundRequestRepository.countByStatusIn(PENDING_REFUND_STATUSES));
        result.put("pendingReturnReviews", customerReturnRequestRepository.countByStatus(
                CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW));
        result.put("openWarrantyClaims", warrantyClaimRepository.countByStatusIn(OPEN_WARRANTY_STATUSES));
        result.put("returnsInTransit", customerReturnRequestRepository.countByStatusIn(List.of(
                CustomerReturnRequest.RequestStatus.APPROVED,
                CustomerReturnRequest.RequestStatus.SHIPPED_BY_CUSTOMER)));
        return result;
    }

    public List<Map<String, Object>> getRevenueByProduct(String startDateStr, String endDateStr) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusMonths(12).with(LocalTime.MIN);
        if (startDateStr != null && endDateStr != null) {
            start = LocalDate.parse(startDateStr).atStartOfDay();
            end = LocalDate.parse(endDateStr).atTime(LocalTime.MAX);
        }
        return orderDetailRepository.findRevenueByProductInDateRange(COMPLETED_STATUSES, start, end).stream()
                .map(row -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("productId", toInt(row[0]));
                    item.put("revenue", toBigDecimal(row[1]));
                    item.put("quantitySold", toLong(row[2]));
                    return item;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getPaymentMethodStats() {
        List<Object[]> results = orderRepository.getPaymentMethodStats(CANCELLED_STATUS);
        long totalOrders = results.stream().mapToLong(row -> toLong(row[1])).sum();
        List<Map<String, Object>> stats = results.stream().map(row -> {
            Order.PaymentMethod method = (Order.PaymentMethod) row[0];
            long count = toLong(row[1]);
            double percentage = totalOrders > 0 ? Math.round(count * 10000.0 / totalOrders) / 100.0 : 0.0;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("method", method.name());
            item.put("orderCount", count);
            item.put("totalAmount", toBigDecimal(row[2]));
            item.put("percentage", percentage);
            return item;
        }).collect(Collectors.toList());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("paymentStats", stats);
        return result;
    }

    private List<Map<String, Object>> buildDailyDataPointsFilled(LocalDateTime start, LocalDateTime end) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM");
        Map<String, BigDecimal> revenueMap = new LinkedHashMap<>();
        Map<String, Long> ordersMap = new LinkedHashMap<>();
        List<String> labels = new ArrayList<>();

        LocalDate cursor = start.toLocalDate();
        LocalDate endDate = end.toLocalDate();
        while (!cursor.isAfter(endDate)) {
            String label = cursor.format(fmt);
            labels.add(label);
            revenueMap.put(label, BigDecimal.ZERO);
            ordersMap.put(label, 0L);
            cursor = cursor.plusDays(1);
        }

        for (Object[] row : orderRepository.getRevenueByDay(start, end, COMPLETED_STATUSES)) {
            java.sql.Date date = (java.sql.Date) row[0];
            String label = date.toLocalDate().format(fmt);
            if (revenueMap.containsKey(label)) {
                revenueMap.put(label, toBigDecimal(row[1]));
                ordersMap.put(label, toLong(row[2]));
            }
        }

        return labels.stream().map(label -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("label", label);
            item.put("revenue", revenueMap.get(label));
            item.put("orders", ordersMap.get(label));
            return item;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildMonthlyDataPointsFilled(LocalDateTime start, LocalDateTime end) {
        Map<String, BigDecimal> revenueMap = new LinkedHashMap<>();
        Map<String, Long> ordersMap = new LinkedHashMap<>();
        List<String> labels = new ArrayList<>();

        LocalDate cursor = start.toLocalDate().withDayOfMonth(1);
        LocalDate endMonth = end.toLocalDate().withDayOfMonth(1);
        while (!cursor.isAfter(endMonth)) {
            String label = String.format("%02d/%d", cursor.getMonthValue(), cursor.getYear());
            labels.add(label);
            revenueMap.put(label, BigDecimal.ZERO);
            ordersMap.put(label, 0L);
            cursor = cursor.plusMonths(1);
        }

        for (Object[] row : orderRepository.getRevenueByMonth(start, end, COMPLETED_STATUSES)) {
            String label = String.format("%02d/%d", toInt(row[1]), toInt(row[0]));
            if (revenueMap.containsKey(label)) {
                revenueMap.put(label, toBigDecimal(row[2]));
                ordersMap.put(label, toLong(row[3]));
            }
        }

        return labels.stream().map(label -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("label", label);
            item.put("revenue", revenueMap.get(label));
            item.put("orders", ordersMap.get(label));
            return item;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildDailyDataPoints(LocalDateTime start, LocalDateTime end) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM");
        return orderRepository.getRevenueByDay(start, end, COMPLETED_STATUSES).stream().map(row -> {
            java.sql.Date date = (java.sql.Date) row[0];
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("label", date.toLocalDate().format(fmt));
            item.put("revenue", toBigDecimal(row[1]));
            item.put("orders", toLong(row[2]));
            return item;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildMonthlyDataPoints(LocalDateTime start, LocalDateTime end) {
        return orderRepository.getRevenueByMonth(start, end, COMPLETED_STATUSES).stream().map(row -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("label", String.format("%02d/%d", toInt(row[1]), toInt(row[0])));
            item.put("revenue", toBigDecimal(row[2]));
            item.put("orders", toLong(row[3]));
            return item;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildYearlyDataPoints() {
        return orderRepository.getRevenueByYear(COMPLETED_STATUSES).stream().map(row -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("label", String.valueOf(toInt(row[0])));
            item.put("revenue", toBigDecimal(row[1]));
            item.put("orders", toLong(row[2]));
            return item;
        }).collect(Collectors.toList());
    }

    private Double calculateGrowthPercent(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return current != null && current.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private Double calculateGrowthPercentLong(Long current, Long previous) {
        if (previous == null || previous == 0) {
            return current != null && current > 0 ? 100.0 : 0.0;
        }
        return Math.round((current - previous) * 10000.0 / previous) / 100.0;
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return new BigDecimal(val.toString());
    }

    private Long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Long l) return l;
        if (val instanceof Integer i) return i.longValue();
        return Long.parseLong(val.toString());
    }

    private Integer toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Integer i) return i;
        return Integer.parseInt(val.toString());
    }
}
