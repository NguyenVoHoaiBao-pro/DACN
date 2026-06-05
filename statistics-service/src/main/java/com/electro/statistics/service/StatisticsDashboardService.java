package com.electro.statistics.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.electro.statistics.client.CatalogClient;
import com.electro.statistics.client.OrderStatisticsClient;
import com.electro.statistics.dto.ConversionRateStatsDTO;
import com.electro.statistics.dto.CustomerSegmentStatsDTO;
import com.electro.statistics.dto.OrderStatusStatsDTO;
import com.electro.statistics.dto.OverviewStatisticsDTO;
import com.electro.statistics.dto.PaymentMethodStatsDTO;
import com.electro.statistics.dto.RecentOrderDTO;
import com.electro.statistics.dto.RevenueChartDTO;
import com.electro.statistics.dto.RevenueStatisticsDTO;
import com.electro.statistics.dto.TopProductStatsDTO;
import com.electro.statistics.dto.TopProductsStatisticsDTO;
import com.electro.statistics.repository.UserInteractionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsDashboardService {

    private final OrderStatisticsClient orderStatisticsClient;
    private final CatalogClient catalogClient;
    private final UserInteractionRepository userInteractionRepository;

    public OverviewStatisticsDTO getOverviewStatistics() {
            // 1. Gọi an toàn sang Order-Service. Nếu sập, trả về Map rỗng (Map.of())
            Map<String, Object> data = safeOrderCall(orderStatisticsClient::getOverview, Map.of());
            // 2. Map rỗng đưa vào hàm toBigDecimal() và toLong() sẽ tự động biến thành các số 0 (Zero) 
    // Nhờ các hàm tiện ích an toàn (toBigDecimal, toLong) nằm ở cuối file.
        return OverviewStatisticsDTO.builder()
                .totalRevenue(toBigDecimal(data.get("totalRevenue")))
                .totalOrders(toLong(data.get("totalOrders")))
                .totalCustomers(toLong(data.get("totalCustomers")))
                .totalProductsSold(toLong(data.get("totalProductsSold")))
                .pendingOrders(toLong(data.get("pendingOrders")))
                .revenueGrowthPercent(toDouble(data.get("revenueGrowthPercent")))
                .orderGrowthPercent(toDouble(data.get("orderGrowthPercent")))
                .customerGrowthPercent(toDouble(data.get("customerGrowthPercent")))
                .build();
    }

    public RevenueChartDTO getRevenueChart(String period, String startDate, String endDate) {
        Map<String, Object> data = safeOrderCall(
                () -> orderStatisticsClient.getRevenueChart(period, startDate, endDate), Map.of("dataPoints", List.of()));
        List<Map<String, Object>> rawPoints = (List<Map<String, Object>>) data.get("dataPoints");
        List<RevenueChartDTO.DataPoint> points = rawPoints == null ? List.of() : rawPoints.stream()
                .map(p -> RevenueChartDTO.DataPoint.builder()
                        .label((String) p.get("label"))
                        .revenue(toBigDecimal(p.get("revenue")))
                        .orders(toLong(p.get("orders")))
                        .build())
                .collect(Collectors.toList());
        return RevenueChartDTO.builder()
                .period((String) data.get("period"))
                .dataPoints(points)
                .totalRevenue(toBigDecimal(data.get("totalRevenue")))
                .averageRevenue(toBigDecimal(data.get("averageRevenue")))
                .build();
    }

    public OrderStatusStatsDTO getOrderStatusStats() {
        Map<String, Object> data = safeOrderCall(orderStatisticsClient::getOrderStatusStats, Map.of("statusBreakdown", List.of()));
        List<Map<String, Object>> raw = (List<Map<String, Object>>) data.get("statusBreakdown");
        List<OrderStatusStatsDTO.StatusBreakdown> breakdown = raw == null ? List.of() : raw.stream()
                .map(b -> OrderStatusStatsDTO.StatusBreakdown.builder()
                        .status((String) b.get("status"))
                        .label((String) b.get("label"))
                        .count(toLong(b.get("count")))
                        .percentage(toDouble(b.get("percentage")))
                        .build())
                .collect(Collectors.toList());
        return OrderStatusStatsDTO.builder()
                .totalOrders(toLong(data.get("totalOrders")))
                .statusBreakdown(breakdown)
                .build();
    }

    public TopProductStatsDTO getTopProductStats(String type, int limit) {
        if ("low-stock".equals(type)) {
            try {
                List<CatalogClient.LowStockVariant> variants = catalogClient.getLowStockVariants();
                List<TopProductStatsDTO.ProductStat> products = variants.stream().map(v -> {
                    String status = v.getStockQuantity() == 0 ? "OUT_OF_STOCK"
                            : v.getStockQuantity() < 5 ? "CRITICAL" : "WARNING";
                    return TopProductStatsDTO.ProductStat.builder()
                            .productId(v.getProductId())
                            .productName(v.getProductName())
                            .variantName(v.getVariantName())
                            .currentStock(v.getStockQuantity())
                            .lowStockThreshold(v.getLowStockThreshold())
                            .status(status)
                            .build();
                }).collect(Collectors.toList());
                return TopProductStatsDTO.builder().type("low-stock").products(products).build();
            } catch (Exception e) {
                return TopProductStatsDTO.builder().type("low-stock").products(List.of()).build();
            }
        }
        List<Map<String, Object>> raw = safeOrderCall(() -> orderStatisticsClient.getTopProducts(limit), List.of());
        List<TopProductStatsDTO.ProductStat> products = raw.stream().map(p ->
                TopProductStatsDTO.ProductStat.builder()
                        .rank(toInt(p.get("rank")))
                        .productId(toInt(p.get("productId")))
                        .productName((String) p.get("productName"))
                        .variantName((String) p.get("variantName"))
                        .quantitySold(toLong(p.get("quantitySold")))
                        .revenue(toBigDecimal(p.get("revenue")))
                        .build()
        ).collect(Collectors.toList());
        return TopProductStatsDTO.builder().type("best-selling").products(products).build();
    }

    public RecentOrderDTO getRecentOrders(int limit) {
        Map<String, Object> data = safeOrderCall(() -> orderStatisticsClient.getRecentOrders(limit), Map.of("recentOrders", List.of()));
        List<Map<String, Object>> raw = (List<Map<String, Object>>) data.get("recentOrders");
        List<RecentOrderDTO.OrderSummary> orders = raw == null ? List.of() : raw.stream()
                .map(o -> RecentOrderDTO.OrderSummary.builder()
                        .orderId(toInt(o.get("orderId")))
                        .orderCode((String) o.get("orderCode"))
                        .customerName((String) o.get("customerName"))
                        .customerEmail((String) o.get("customerEmail"))
                        .totalAmount(toBigDecimal(o.get("totalAmount")))
                        .status((String) o.get("status"))
                        .paymentMethod((String) o.get("paymentMethod"))
                        .paymentStatus((String) o.get("paymentStatus"))
                        .orderDate((String) o.get("orderDate"))
                        .itemCount(toInt(o.get("itemCount")))
                        .build())
                .collect(Collectors.toList());
        return RecentOrderDTO.builder().recentOrders(orders).build();
    }

    public PaymentMethodStatsDTO getPaymentMethodStats() {
        Map<String, Object> data = safeOrderCall(orderStatisticsClient::getPaymentMethodStats, Map.of("paymentStats", List.of()));
        List<Map<String, Object>> raw = (List<Map<String, Object>>) data.get("paymentStats");
        List<PaymentMethodStatsDTO.PaymentStat> stats = raw == null ? List.of() : raw.stream()
                .map(p -> PaymentMethodStatsDTO.PaymentStat.builder()
                        .method((String) p.get("method"))
                        .orderCount(toLong(p.get("orderCount")))
                        .totalAmount(toBigDecimal(p.get("totalAmount")))
                        .percentage(toDouble(p.get("percentage")))
                        .build())
                .collect(Collectors.toList());
        return PaymentMethodStatsDTO.builder().paymentStats(stats).build();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ConversionRateStatsDTO getConversionRateStats() {
        List<Object[]> results;
        try {
            results = userInteractionRepository.countViewsAndPurchasesByProduct();
        } catch (Exception e) {
            return ConversionRateStatsDTO.builder().productRates(List.of()).build();
        }
        List<ConversionRateStatsDTO.ProductRate> rates = results.stream().map(row -> {
            Integer productId = toInt(row[0]);
            long viewCount = toLong(row[1]);
            long purchaseCount = toLong(row[2]);
            double conversionRate = viewCount > 0 ? Math.round(purchaseCount * 10000.0 / viewCount) / 100.0 : 0.0;
            String productName = null;
            try {
                productName = catalogClient.getProductById(productId).getName();
            } catch (Exception ignored) {
            }
            return ConversionRateStatsDTO.ProductRate.builder()
                    .productId(productId)
                    .productName(productName)
                    .viewCount(viewCount)
                    .purchaseCount(purchaseCount)
                    .conversionRate(conversionRate)
                    .build();
        }).collect(Collectors.toList());
        return ConversionRateStatsDTO.builder().productRates(rates).build();
    }

    public CustomerSegmentStatsDTO getCustomerSegments() {
        return CustomerSegmentStatsDTO.builder().segments(List.of()).build();
    }

    public RevenueStatisticsDTO getRevenueStatistics() {
        return new RevenueStatisticsDTO();
    }

    public TopProductsStatisticsDTO getTopProductsStatistics() {
        return new TopProductsStatisticsDTO();
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

    private Double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Double d) return d;
        if (val instanceof BigDecimal bd) return bd.doubleValue();
        if (val instanceof Number n) return n.doubleValue();
        return Double.parseDouble(val.toString());
    }

    /** Feign/Jackson thường trả Double thay vì BigDecimal từ Map JSON. */
    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Double d) return BigDecimal.valueOf(d);
        if (val instanceof Float f) return BigDecimal.valueOf(f.doubleValue());
        if (val instanceof Integer i) return BigDecimal.valueOf(i);
        if (val instanceof Long l) return BigDecimal.valueOf(l);
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(val.toString());
    }

    @FunctionalInterface
    private interface OrderCall<T> {
        T get();
    }

    private <T> T safeOrderCall(OrderCall<T> call, T fallback) {
        try {
            // Cầu dao đóng (Bình thường): Thử gọi sang Order Service lấy doanh thu)
            T result = call.get();
            return result != null ? result : fallback;
        } catch (Exception e) {
            // Cầu dao MỞ (Khi Order-Service bị sập hoặc quá tải):
        // Bắt ngay lỗi CallNotPermittedException do Resilience4j ném ra.
        // Trả về DỮ LIỆU GIẢ (fallback) thay vì báo lỗi hệ thống.
            return fallback;
        }
    }
}
